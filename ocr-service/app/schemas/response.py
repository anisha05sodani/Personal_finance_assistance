"""Pydantic response models for the OCR API."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ImageDimensions(BaseModel):
    width: int = Field(..., ge=0, description="Image width in pixels.")
    height: int = Field(..., ge=0, description="Image height in pixels.")


class TextBlock(BaseModel):
    text: str = Field(..., description="Recognised text for this region.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence (0-1).")
    bounding_box: List[List[float]] = Field(
        ...,
        description="Four [x, y] corner points of the text region (clockwise).",
        examples=[[[10, 10], [200, 10], [200, 40], [10, 40]]],
    )


class Paragraph(BaseModel):
    text: str = Field(..., description="Merged text of the paragraph.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Average confidence of member blocks.")
    blocks: List[TextBlock] = Field(default_factory=list, description="Lines that form the paragraph.")


class OCRResponse(BaseModel):
    success: bool = True
    full_text: str = Field(..., description="Complete extracted text in reading order.")
    blocks: List[TextBlock] = Field(default_factory=list)
    paragraphs: List[Paragraph] = Field(default_factory=list)
    image_dimensions: Optional[ImageDimensions] = None
    num_pages: int = 1
    processing_time_ms: Optional[float] = None
    request_id: Optional[str] = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    request_id: Optional[str] = None
