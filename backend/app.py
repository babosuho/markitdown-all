"""
FastAPI Server for All-to-Markdown
Provides endpoints for document conversion, ZIP packaging, and static UI serving.
Supports Multimodal Gemini Vision AI for image-heavy slide decks and PDFs.
"""
import io
import os
import zipfile
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from backend.parsers.smart_router import SmartRouter, ConversionResult

app = FastAPI(
    title="All-to-Markdown API",
    description="Intelligent multi-format document to Markdown converter for Obsidian and AI pipelines with Vision AI",
    version="1.1.0"
)

# Enable CORS for Cloudflare Pages and local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = SmartRouter()
thread_pool = ThreadPoolExecutor(max_workers=4)


def get_default_api_key() -> str:
    """Retrieve Gemini API key from environment, checking case variations and stripping quotes."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass

    for k, v in os.environ.items():
        clean_k = k.strip().upper()
        if clean_k in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_KEY") and v and v.strip():
            return v.strip().strip("'\"")
    return ""


def _process_single_file(
    file_bytes: bytes,
    filename: str,
    enable_frontmatter: bool,
    tags: Optional[List[str]],
    use_vision: bool = False,
    api_key: Optional[str] = None,
) -> ConversionResult:
    return router.convert_file(
        source=file_bytes,
        filename=filename,
        enable_frontmatter=enable_frontmatter,
        frontmatter_tags=tags,
        use_vision=use_vision,
        gemini_api_key=api_key or get_default_api_key(),
    )


@app.get("/api/health")
def health_check():
    default_key = get_default_api_key()
    return {
        "status": "healthy",
        "service": "All-to-Markdown",
        "version": "1.1.0",
        "vision_ai_available": True,
        "has_default_api_key": bool(default_key),
        "supported_extensions": list(router.OFFICE_EXTENSIONS | router.HWPX_EXTENSIONS | router.TEXT_EXTENSIONS),
    }


@app.post("/api/convert")
async def convert_documents(
    files: List[UploadFile] = File(...),
    enable_frontmatter: bool = Form(True),
    tags: Optional[str] = Form(None),
    use_vision: bool = Form(False),
    api_key: Optional[str] = Form(None),
    x_gemini_api_key: Optional[str] = Header(None),
):
    """
    Convert single or multiple uploaded files to Markdown.
    Supports Vision AI when use_vision is True and Gemini API key is provided.
    """
    if not files:
        raise HTTPException(status_code=400, detail="업로드된 파일이 없습니다.")

    parsed_tags = [t.strip() for t in tags.split(",")] if tags else None
    effective_api_key = api_key or x_gemini_api_key or get_default_api_key()

    # Read all files into memory
    file_payloads = []
    for f in files:
        content = await f.read()
        file_payloads.append((content, f.filename or "document"))

    # Convert concurrently
    futures = [
        thread_pool.submit(
            _process_single_file,
            content,
            fname,
            enable_frontmatter,
            parsed_tags,
            use_vision,
            effective_api_key,
        )
        for content, fname in file_payloads
    ]
    results = [f.result() for f in futures]

    output_list = []
    success_count = 0
    failed_count = 0

    for r in results:
        if r.success:
            success_count += 1
        else:
            failed_count += 1

        md_name = os.path.splitext(r.filename)[0] + ".md"
        output_list.append({
            "filename": r.filename,
            "md_filename": md_name,
            "markdown": r.markdown,
            "char_count": r.char_count,
            "line_count": r.line_count,
            "parser_used": r.parser_used,
            "success": r.success,
            "error": r.error,
        })

    return {
        "total": len(output_list),
        "success_count": success_count,
        "failed_count": failed_count,
        "results": output_list,
    }


@app.post("/api/convert/zip")
async def convert_and_download_zip(
    files: List[UploadFile] = File(...),
    enable_frontmatter: bool = Form(True),
    tags: Optional[str] = Form(None),
    use_vision: bool = Form(False),
    api_key: Optional[str] = Form(None),
    x_gemini_api_key: Optional[str] = Header(None),
):
    """
    Convert multiple files and directly download as a single ZIP archive.
    """
    if not files:
        raise HTTPException(status_code=400, detail="업로드된 파일이 없습니다.")

    parsed_tags = [t.strip() for t in tags.split(",")] if tags else None
    effective_api_key = api_key or x_gemini_api_key or get_default_api_key()

    file_payloads = []
    for f in files:
        content = await f.read()
        file_payloads.append((content, f.filename or "document"))

    futures = [
        thread_pool.submit(
            _process_single_file,
            content,
            fname,
            enable_frontmatter,
            parsed_tags,
            use_vision,
            effective_api_key,
        )
        for content, fname in file_payloads
    ]
    results = [f.result() for f in futures]

    # Create ZIP in-memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as z:
        for r in results:
            if r.success and r.markdown:
                md_name = os.path.splitext(r.filename)[0] + ".md"
                z.writestr(md_name, r.markdown.encode("utf-8"))

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="all-converted-markdown.zip"'},
    )


# Mount frontend static directory if exists
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
