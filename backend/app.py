"""
FastAPI Server for All-to-Markdown
Provides endpoints for document conversion, ZIP packaging, and static UI serving.
Supports Multimodal Gemini Vision AI for image-heavy slide decks and PDFs.
"""
import io
import json
import os
import urllib.request
import zipfile
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor

from pydantic import BaseModel
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


class GDriveUploadRequest(BaseModel):
    webhook_url: str
    filename: str
    markdown: str


@app.post("/api/gdrive/upload")
def upload_to_gdrive(req: GDriveUploadRequest):
    """
    Proxy upload to Google Apps Script webhook to bypass browser CORS redirects.
    """
    if not req.webhook_url.startswith("https://script.google.com/"):
        raise HTTPException(status_code=400, detail="올바른 Google Apps Script URL이 아닙니다.")

    data = json.dumps({"filename": req.filename, "markdown": req.markdown}).encode("utf-8")
    req_obj = urllib.request.Request(
        req.webhook_url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "All-to-Markdown-Converter"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req_obj, timeout=30) as response:
            res_body = response.read().decode("utf-8")
            try:
                parsed = json.loads(res_body)
                if parsed.get("status") == "error":
                    raise HTTPException(status_code=500, detail=parsed.get("message", "구글 드라이브 스크립트 실행 오류"))
                return parsed
            except json.JSONDecodeError:
                return {"status": "success", "raw": res_body}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"구글 드라이브 전송 실패: {str(e)}")


class UrlConvertRequest(BaseModel):
    url: str
    enable_frontmatter: bool = True
    tags: Optional[str] = None
    crawl_subpages: bool = False
    max_pages: int = 10


def _convert_single_url(target_url: str, enable_frontmatter: bool = True, tags: Optional[str] = None) -> dict:
    from urllib.parse import urlparse
    from backend.parsers.markdown_cleaner import MarkdownCleaner

    target_url = target_url.strip()
    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = "https://" + target_url

    parsed_url = urlparse(target_url)
    domain = parsed_url.netloc or "webpage"

    try:
        # Use MarkItDown convert_url
        result = router.markitdown_parser.md_engine.convert_url(target_url)
        raw_markdown = result.text_content or ""
        page_title = getattr(result, "title", None) or domain

        if not page_title or page_title.strip() == "":
            path_slug = parsed_url.path.strip("/").replace("/", "_")
            page_title = f"{domain}_{path_slug}" if path_slug else domain

        # Clean title for safe filename
        safe_title = "".join(c for c in page_title if c.isalnum() or c in (" ", "_", "-", ".", "(", ")")).strip()
        if not safe_title:
            safe_title = domain
        safe_title = safe_title[:60]
        md_filename = f"{safe_title}.md"

        # Tags
        parsed_tags = [t.strip() for t in tags.split(",")] if tags else ["web-article", "all-to-markdown"]

        # Clean markdown & add Obsidian YAML frontmatter
        cleaned_body = MarkdownCleaner.clean(raw_markdown)
        if enable_frontmatter:
            cleaned = MarkdownCleaner.add_frontmatter(
                cleaned_body,
                filename=md_filename,
                tags=parsed_tags,
                extra_meta={"source_url": target_url, "parser": "Firecrawl Web Reader (MarkItDown)"},
            )
        else:
            cleaned = cleaned_body

        line_count = len(cleaned.splitlines())
        char_count = len(cleaned)

        return {
            "filename": f"URL: {target_url}",
            "md_filename": md_filename,
            "markdown": cleaned,
            "char_count": char_count,
            "line_count": line_count,
            "parser_used": "Firecrawl Web Reader (MarkItDown)",
            "success": True,
            "error": None,
            "source_url": target_url,
        }
    except Exception as e:
        return {
            "filename": f"URL: {target_url}",
            "md_filename": f"{domain}_error.md",
            "markdown": "",
            "char_count": 0,
            "line_count": 0,
            "parser_used": "Firecrawl Web Reader",
            "success": False,
            "error": f"웹페이지 변환 실패: {str(e)}",
            "source_url": target_url,
        }


def _crawl_internal_urls(root_url: str, max_pages: int = 10) -> list:
    from urllib.parse import urlparse, urljoin
    from bs4 import BeautifulSoup
    import urllib.request

    if not root_url.startswith("http://") and not root_url.startswith("https://"):
        root_url = "https://" + root_url

    parsed_root = urlparse(root_url)
    base_domain = parsed_root.netloc.lower()

    skip_extensions = (
        ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico",
        ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z",
        ".mp3", ".mp4", ".wav", ".avi", ".mov",
        ".css", ".js", ".json", ".xml", ".woff", ".woff2", ".ttf"
    )

    discovered = [root_url]
    visited = {root_url.rstrip("/")}

    try:
        req = urllib.request.Request(
            root_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode("utf-8", errors="ignore")

        soup = BeautifulSoup(html, "html.parser")
        for tag in soup.find_all("a", href=True):
            href = tag["href"].strip()
            if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
                continue

            full_url = urljoin(root_url, href)
            full_url = full_url.split("#")[0].rstrip("/")
            if not full_url:
                continue

            p = urlparse(full_url)
            if p.netloc.lower() != base_domain and p.netloc.lower() != f"www.{base_domain}" and f"www.{p.netloc.lower()}" != base_domain:
                continue

            if any(p.path.lower().endswith(ext) for ext in skip_extensions):
                continue

            if full_url not in visited:
                visited.add(full_url)
                discovered.append(full_url)
                if len(discovered) >= max_pages:
                    break
    except Exception as e:
        logger.warning(f"Error crawling subpages from {root_url}: {e}")

    return discovered[:max_pages]


@app.post("/api/convert/url")
def convert_url_to_markdown(req: UrlConvertRequest):
    """
    Firecrawl-style web page to Markdown converter.
    Extracts clean readable content from any webpage and formats it for Obsidian/AI pipelines.
    Supports single page or deep subpage crawling on the same domain.
    """
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="변환할 웹페이지 URL을 입력해 주세요.")

    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    target_urls = [url]
    if req.crawl_subpages:
        target_urls = _crawl_internal_urls(url, max_pages=min(max(1, req.max_pages), 20))

    results = []
    for u in target_urls:
        item = _convert_single_url(u, enable_frontmatter=req.enable_frontmatter, tags=req.tags)
        results.append(item)

    success_count = sum(1 for r in results if r.get("success"))

    if not req.crawl_subpages and len(results) == 1:
        single = dict(results[0])
        single["total"] = 1
        single["results"] = results
        return single

    return {
        "total": len(results),
        "success_count": success_count,
        "failed_count": len(results) - success_count,
        "results": results,
    }


# Mount frontend static directory if exists
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
