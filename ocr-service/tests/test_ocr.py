"""Unit and API tests for the OCR service.

The PaddleOCR engine is mocked, so these tests run without downloading model
weights. OpenCV and NumPy are still required (they back the preprocessing code
and synthetic-image generation).
"""
from __future__ import annotations

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import config
from app.main import app
from app.services import ocr_service
from app.utils import preprocessing

# A canned PaddleOCR-style result: [ [ [box, (text, conf)], ... ] ]
CANNED_RESULT = [
    [
        [[[10, 10], [200, 10], [200, 40], [10, 40]], ("Hello World", 0.98)],
        [[[10, 60], [220, 60], [220, 90], [10, 90]], ("Second line", 0.95)],
    ]
]


def _png_bytes(width: int = 240, height: int = 100) -> bytes:
    image = np.full((height, width, 3), 255, dtype=np.uint8)
    ok, buffer = cv2.imencode(".png", image)
    assert ok
    return buffer.tobytes()


@pytest.fixture
def client(monkeypatch):
    # Don't load the real model and bypass inference with canned output.
    monkeypatch.setattr(config.settings, "EAGER_LOAD", False)
    monkeypatch.setattr(
        ocr_service.OCREngine, "predict", lambda self, image: CANNED_RESULT
    )
    with TestClient(app) as test_client:
        yield test_client


# --------------------------------------------------------------------------- #
# API tests
# --------------------------------------------------------------------------- #
def test_extract_text_success(client):
    response = client.post(
        "/extract-text", files={"file": ("sample.png", _png_bytes(), "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Hello World" in data["full_text"]
    assert len(data["blocks"]) == 2
    assert data["blocks"][0]["confidence"] == pytest.approx(0.98)
    assert len(data["blocks"][0]["bounding_box"]) == 4
    assert data["image_dimensions"]["width"] == 240
    assert data["processing_time_ms"] is not None
    assert data["request_id"]


def test_unsupported_file_type(client):
    response = client.post(
        "/extract-text", files={"file": ("notes.txt", b"hello", "text/plain")}
    )
    assert response.status_code == 415


def test_empty_file(client):
    response = client.post(
        "/extract-text", files={"file": ("sample.png", b"", "image/png")}
    )
    assert response.status_code == 400


def test_file_too_large(client, monkeypatch):
    monkeypatch.setattr(config.settings, "MAX_FILE_SIZE_MB", 0)
    response = client.post(
        "/extract-text", files={"file": ("sample.png", _png_bytes(), "image/png")}
    )
    assert response.status_code == 413


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.headers.get("X-Request-ID")


# --------------------------------------------------------------------------- #
# Post-processing unit tests
# --------------------------------------------------------------------------- #
def test_parse_result():
    blocks = ocr_service._parse_result(CANNED_RESULT)
    assert len(blocks) == 2
    assert blocks[0]["text"] == "Hello World"
    assert blocks[0]["confidence"] == pytest.approx(0.98)


def test_parse_result_empty():
    assert ocr_service._parse_result(None) == []
    assert ocr_service._parse_result([None]) == []


def test_sort_reading_order():
    blocks = ocr_service._parse_result(CANNED_RESULT)
    reversed_blocks = list(reversed(blocks))
    ordered = ocr_service._sort_reading_order(reversed_blocks)
    assert ordered[0]["text"] == "Hello World"


def test_merge_paragraphs():
    blocks = ocr_service._parse_result(CANNED_RESULT)
    paragraphs = ocr_service._merge_paragraphs(blocks, y_gap_ratio=1.6)
    assert paragraphs
    assert paragraphs[0]["confidence"] == pytest.approx((0.98 + 0.95) / 2, abs=1e-3)


# --------------------------------------------------------------------------- #
# Preprocessing unit tests
# --------------------------------------------------------------------------- #
def test_to_grayscale():
    image = np.zeros((50, 50, 3), dtype=np.uint8)
    gray = preprocessing.to_grayscale(image)
    assert gray.ndim == 2


def test_resize_if_low_res_upscales():
    image = np.zeros((50, 50, 3), dtype=np.uint8)
    out = preprocessing.resize_if_low_res(image, 200)
    assert min(out.shape[:2]) >= 200


def test_resize_if_low_res_noop_for_large():
    image = np.zeros((300, 300, 3), dtype=np.uint8)
    out = preprocessing.resize_if_low_res(image, 200)
    assert out.shape[:2] == (300, 300)


def test_adaptive_threshold_is_binary():
    gray = (np.random.rand(60, 60) * 255).astype(np.uint8)
    binary = preprocessing.adaptive_threshold(gray)
    assert set(np.unique(binary)).issubset({0, 255})


def test_preprocess_image_returns_three_channels():
    image = np.full((120, 200, 3), 200, dtype=np.uint8)
    out = preprocessing.preprocess_image(image, min_dimension=100, apply_threshold=True)
    assert out.ndim == 3 and out.shape[2] == 3


def test_bytes_to_image_invalid():
    with pytest.raises(ValueError):
        preprocessing.bytes_to_image(b"not-an-image")
