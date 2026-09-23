"""
Smoke test script for sample documents
Executed by harness.ps1 or CI/CD
"""
import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.parsers.smart_router import SmartRouter

def run_smoke():
    router = SmartRouter()
    print("Running smoke tests on sample files in project root...")

    # 1. PDF Test
    pdf_files = list(root_dir.glob("*.pdf"))
    if pdf_files:
        res = router.convert_file(str(pdf_files[0]))
        assert res.success is True, f"PDF conversion failed: {res.error}"
        assert len(res.markdown) > 0, "PDF conversion produced empty markdown"
        print(f"  [OK] PDF 변환 성공: {pdf_files[0].name} ({len(res.markdown)}자)")
    else:
        print("  [SKIP] PDF 샘플 파일 없음")

    # 2. HWPX Test
    hwpx_files = list(root_dir.glob("*.hwpx"))
    if hwpx_files:
        res = router.convert_file(str(hwpx_files[0]))
        assert res.success is True, f"HWPX conversion failed: {res.error}"
        assert len(res.markdown) > 0, "HWPX conversion produced empty markdown"
        print(f"  [OK] HWPX 변환 성공: {hwpx_files[0].name} ({len(res.markdown)}자)")
    else:
        print("  [SKIP] HWPX 샘플 파일 없음")

    print("All smoke tests passed successfully!")

if __name__ == "__main__":
    try:
        run_smoke()
    except Exception as e:
        print(f"Smoke test failed: {e}", file=sys.stderr)
        sys.exit(1)
