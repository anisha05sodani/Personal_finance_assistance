"""Core OCR service: model lifecycle, inference and result post-processing.

The PaddleOCR model is expensive to construct, so it is wrapped in a thread-safe
singleton (:class:`OCREngine`) that loads the weights exactly once and reuses them
for every request. Inference is serialised with a lock because the underlying
predictor is not guaranteed to be thread-safe; the FastAPI layer keeps the event
loop responsive by running inference in a worker thread.
"""
from __future__ import annotations

import logging
import os
import threading
from typing import Any, Dict, List, Optional

import numpy as np

from ..config import settings
from ..utils import preprocessing

logger = logging.getLogger(__name__)

Block = Dict[str, Any]


class OCREngine:
    """Thread-safe singleton wrapper around the PaddleOCR model."""

    _instance: Optional["OCREngine"] = None
    _instance_lock = threading.Lock()

    def __init__(self) -> None:
        self._engine = None
        self._load_lock = threading.Lock()
        self._predict_lock = threading.Lock()

    @classmethod
    def instance(cls) -> "OCREngine":
        """Return the process-wide singleton instance."""
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    @property
    def is_loaded(self) -> bool:
        return self._engine is not None

    def load(self):
        """Load the PaddleOCR model once. Safe to call repeatedly."""
        if self._engine is None:
            with self._load_lock:
                if self._engine is None:
                    from paddleocr import PaddleOCR  # heavy import, done lazily

                    logger.info(
                        "Loading PaddleOCR model (lang=%s, gpu=%s)...",
                        settings.LANG,
                        settings.USE_GPU,
                    )
                    self._engine = PaddleOCR(
                        use_angle_cls=settings.USE_ANGLE_CLS,
                        lang=settings.LANG,
                        use_gpu=settings.USE_GPU,
                        show_log=False,
                    )
                    logger.info("PaddleOCR model loaded and ready.")
        return self._engine

    def predict(self, image: np.ndarray) -> Any:
        """Run raw OCR inference on a single image array."""
        engine = self.load()
        with self._predict_lock:
            return engine.ocr(image, cls=settings.USE_ANGLE_CLS)


# --------------------------------------------------------------------------- #
# Result parsing / post-processing
# --------------------------------------------------------------------------- #
def _parse_result(raw: Any) -> List[Block]:
    """Convert PaddleOCR's raw output into a flat list of text-block dicts."""
    blocks: List[Block] = []
    if not raw:
        return blocks
    # PaddleOCR returns one entry per image; we always submit a single image.
    page = raw[0] if isinstance(raw, (list, tuple)) and raw else raw
    if not page:
        return blocks
    for line in page:
        try:
            box, (text, confidence) = line[0], line[1]
        except (ValueError, TypeError, IndexError):
            continue
        if text is None:
            continue
        bounding_box = [[float(point[0]), float(point[1])] for point in box]
        blocks.append(
            {
                "text": str(text).strip(),
                "confidence": round(float(confidence), 4),
                "bounding_box": bounding_box,
            }
        )
    return blocks


def _box_top(block: Block) -> float:
    return min(point[1] for point in block["bounding_box"])


def _box_bottom(block: Block) -> float:
    return max(point[1] for point in block["bounding_box"])


def _box_left(block: Block) -> float:
    return min(point[0] for point in block["bounding_box"])


def _sort_reading_order(blocks: List[Block]) -> List[Block]:
    """Sort blocks top-to-bottom then left-to-right (natural reading order).

    Rows are bucketed in ~10px bands so words on the same line keep their
    left-to-right order even when their top coordinates differ slightly.
    """
    return sorted(blocks, key=lambda b: (round(_box_top(b) / 10.0), _box_left(b)))


def _build_paragraph(blocks: List[Block]) -> Dict[str, Any]:
    text = " ".join(b["text"] for b in blocks).strip()
    confidence = (
        round(sum(b["confidence"] for b in blocks) / len(blocks), 4) if blocks else 0.0
    )
    return {"text": text, "confidence": confidence, "blocks": blocks}


def _merge_paragraphs(blocks: List[Block], y_gap_ratio: float) -> List[Dict[str, Any]]:
    """Group vertically-adjacent lines into paragraphs based on the y-gap."""
    paragraphs: List[Dict[str, Any]] = []
    current: List[Block] = []
    prev_bottom: Optional[float] = None
    prev_height: Optional[float] = None

    for block in blocks:
        top, bottom = _box_top(block), _box_bottom(block)
        height = max(bottom - top, 1.0)
        gap = top - prev_bottom if prev_bottom is not None else 0.0
        if prev_bottom is None or gap <= y_gap_ratio * (prev_height or height):
            current.append(block)
        else:
            paragraphs.append(_build_paragraph(current))
            current = [block]
        prev_bottom, prev_height = bottom, height

    if current:
        paragraphs.append(_build_paragraph(current))
    return paragraphs


# --------------------------------------------------------------------------- #
# High-level API
# --------------------------------------------------------------------------- #
def _ocr_single_image(image: np.ndarray) -> List[Block]:
    processed = preprocessing.preprocess_image(
        image,
        min_dimension=settings.MIN_DIMENSION,
        apply_threshold=settings.APPLY_THRESHOLD,
    )
    raw = OCREngine.instance().predict(processed)
    return _sort_reading_order(_parse_result(raw))


def extract_text_from_bytes(data: bytes, extension: str) -> Dict[str, Any]:
    """Extract text from raw file bytes (image or PDF).

    Returns a structured dict with ``full_text``, ``blocks``, ``paragraphs``,
    ``image_dimensions`` and ``num_pages``.
    """
    if not data:
        raise ValueError("Empty file contents.")

    extension = extension.lower().lstrip(".")
    all_blocks: List[Block] = []
    width = height = 0
    num_pages = 1

    if extension == "pdf":
        pages = preprocessing.pdf_to_images(data, dpi=settings.PDF_RENDER_DPI)
        num_pages = len(pages)
        if pages:
            height, width = pages[0].shape[:2]
        for page_image in pages:
            all_blocks.extend(_ocr_single_image(page_image))
    else:
        image = preprocessing.bytes_to_image(data)
        height, width = image.shape[:2]
        all_blocks = _ocr_single_image(image)

    paragraphs = _merge_paragraphs(all_blocks, settings.PARAGRAPH_Y_GAP_RATIO)
    full_text = "\n".join(p["text"] for p in paragraphs) if paragraphs else ""

    return {
        "full_text": full_text,
        "blocks": all_blocks,
        "paragraphs": paragraphs,
        "image_dimensions": {"width": int(width), "height": int(height)},
        "num_pages": num_pages,
    }


def extract_text(image_path: str) -> Dict[str, Any]:
    """Standalone helper to extract text from a file path (no API required).

    Example::

        from app.services.ocr_service import extract_text

        result = extract_text("receipt.jpg")
        print(result["full_text"])
        for block in result["blocks"]:
            print(block["confidence"], block["text"])
    """
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"File not found: {image_path}")
    extension = os.path.splitext(image_path)[1].lower().lstrip(".")
    with open(image_path, "rb") as handle:
        data = handle.read()
    return extract_text_from_bytes(data, extension)
