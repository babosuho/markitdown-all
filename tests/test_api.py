import io
import zipfile
import pytest
from starlette.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "supported_extensions" in data


def test_api_convert_text_and_csv():
    files = [
        ("files", ("test.txt", io.BytesIO(b"Hello Markdown World\nThis is line 2"), "text/plain")),
        ("files", ("test.csv", io.BytesIO("col1,col2\nval1,val2".encode("utf-8")), "text/csv")),
    ]
    response = client.post("/api/convert", files=files, data={"enable_frontmatter": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert data["success_count"] == 2
    assert data["failed_count"] == 0
    assert len(data["results"]) == 2

    txt_res = next(r for r in data["results"] if r["filename"] == "test.txt")
    assert "Hello Markdown World" in txt_res["markdown"]
    assert "---" in txt_res["markdown"]

    csv_res = next(r for r in data["results"] if r["filename"] == "test.csv")
    assert "| col1 | col2 |" in csv_res["markdown"]


def test_api_convert_zip():
    files = [
        ("files", ("test1.txt", io.BytesIO(b"Document 1 Content"), "text/plain")),
        ("files", ("test2.txt", io.BytesIO(b"Document 2 Content"), "text/plain")),
    ]
    response = client.post("/api/convert/zip", files=files, data={"enable_frontmatter": "true"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"

    # Verify zip content
    zip_bytes = io.BytesIO(response.content)
    with zipfile.ZipFile(zip_bytes, "r") as z:
        names = z.namelist()
        assert "test1.md" in names
        assert "test2.md" in names
        content1 = z.read("test1.md").decode("utf-8")
        assert "Document 1 Content" in content1


def test_api_gdrive_validation():
    # Invalid webhook URL should return 400
    res = client.post("/api/gdrive/upload", json={
        "webhook_url": "https://invalid-url.com",
        "filename": "test.md",
        "markdown": "# test"
    })
    assert res.status_code == 400
    assert "Google Apps Script URL" in res.json()["detail"]
