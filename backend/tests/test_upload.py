"""Tests for the pure (no-OCR, no-network) helpers in the upload service.

These exercise the regex-based parsing and the upload size guard without needing
Tesseract, real files, or any network access.
"""
import pytest
from fastapi import HTTPException

from app.services.upload import (
    MAX_UPLOAD_BYTES,
    UploadService,
    _read_within_limit,
)


def test_read_within_limit_rejects_empty():
    with pytest.raises(HTTPException) as exc:
        _read_within_limit(b"")
    assert exc.value.status_code == 400


def test_read_within_limit_rejects_oversized():
    with pytest.raises(HTTPException) as exc:
        _read_within_limit(b"x" * (MAX_UPLOAD_BYTES + 1))
    assert exc.value.status_code == 413


def test_read_within_limit_accepts_normal():
    # Should not raise.
    _read_within_limit(b"a reasonable amount of bytes")


def test_parse_transaction_from_text_with_total_and_category():
    text = "SuperMart\nDate: 2025-05-10\nGroceries\nTotal: 1,234.56"
    tx = UploadService.parse_transaction_from_text(text)
    assert tx is not None
    assert tx["amount"] == "1234.56"
    assert tx["date"] == "2025-05-10"
    assert tx["category"] == "groceries"
    assert tx["type"] == "expense"


def test_parse_transaction_from_text_defaults_date_when_missing():
    text = "Total: 99.00"
    tx = UploadService.parse_transaction_from_text(text)
    assert tx is not None
    assert tx["amount"] == "99.00"
    # No date in text -> defaults to today's date string.
    assert tx["date"]
    assert tx["category"] == "others"


def test_parse_transaction_from_text_returns_none_without_amount():
    assert UploadService.parse_transaction_from_text("just some words, no numbers") is None


def test_extract_receipt_details():
    text = (
        "Joe's Diner\n"
        "Date: 2025-06-15\n"
        "12:45 PM\n"
        "Burger 12.00\n"
        "Fries 4.50\n"
        "Subtotal: 16.50\n"
        "Tax: 1.50\n"
        "Total: 18.00\n"
        "VISA\n"
    )
    details = UploadService.extract_receipt_details(text)
    assert details["merchant"] == "Joe's Diner"
    assert details["date"] == "2025-06-15"
    assert details["total"] == "18.00"
    assert details["subtotal"] == "16.50"
    assert details["tax"] == "1.50"
    assert details["payment_method"] == "VISA"
    item_names = {i["name"] for i in details["items"]}
    assert "Burger" in item_names
    assert "Fries" in item_names
