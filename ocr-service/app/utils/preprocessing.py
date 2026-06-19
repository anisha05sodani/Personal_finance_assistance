"""OpenCV-based image preprocessing utilities for OCR.

Each function is small, pure and independently testable. ``preprocess_image``
chains them into the full pipeline required before running OCR:

    grayscale -> denoise -> deskew -> resize -> (optional) adaptive threshold
"""
from __future__ import annotations

import logging
from typing import List

import cv2
import numpy as np

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Decoders
# --------------------------------------------------------------------------- #
def bytes_to_image(data: bytes) -> np.ndarray:
    """Decode raw image bytes into a BGR numpy array."""
    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image. The file may be corrupt or unsupported.")
    return image


def pdf_to_images(data: bytes, dpi: int = 200) -> List[np.ndarray]:
    """Render every PDF page to a BGR numpy array.

    Uses PyMuPDF (``fitz``) so there is no system dependency on Poppler.
    """
    import fitz  # PyMuPDF, imported lazily so the module imports without it

    images: List[np.ndarray] = []
    with fitz.open(stream=data, filetype="pdf") as document:
        for page in document:
            pixmap = page.get_pixmap(dpi=dpi)
            frame = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(
                pixmap.height, pixmap.width, pixmap.n
            )
            if pixmap.n == 4:
                frame = cv2.cvtColor(frame, cv2.COLOR_RGBA2BGR)
            elif pixmap.n == 3:
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            else:  # single channel
                frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
            images.append(frame)
    return images


# --------------------------------------------------------------------------- #
# Individual preprocessing steps
# --------------------------------------------------------------------------- #
def to_grayscale(image: np.ndarray) -> np.ndarray:
    """Convert a BGR/BGRA image to single-channel grayscale."""
    if image.ndim == 2:
        return image
    if image.shape[2] == 4:
        image = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def denoise(gray: np.ndarray) -> np.ndarray:
    """Reduce sensor/scan noise while keeping edges."""
    return cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)


def adaptive_threshold(gray: np.ndarray) -> np.ndarray:
    """Binarize using a locally-adaptive Gaussian threshold."""
    return cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15
    )


def resize_if_low_res(image: np.ndarray, min_dimension: int) -> np.ndarray:
    """Upscale low-resolution images so the smallest side >= ``min_dimension``."""
    height, width = image.shape[:2]
    smallest = min(height, width)
    if smallest == 0 or smallest >= min_dimension:
        return image
    scale = min_dimension / float(smallest)
    new_size = (int(round(width * scale)), int(round(height * scale)))
    logger.debug("Upscaling %sx%s -> %sx%s", width, height, new_size[0], new_size[1])
    return cv2.resize(image, new_size, interpolation=cv2.INTER_CUBIC)


def deskew(gray: np.ndarray) -> np.ndarray:
    """Estimate and correct small page-skew using the text bounding box angle."""
    inverted = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(inverted > 0))
    if coords.shape[0] < 10:
        return gray
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    if abs(angle) < 0.1:  # skip negligible rotations
        return gray
    height, width = gray.shape[:2]
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), angle, 1.0)
    return cv2.warpAffine(
        gray,
        matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


# --------------------------------------------------------------------------- #
# Full pipeline
# --------------------------------------------------------------------------- #
def preprocess_image(
    image: np.ndarray,
    *,
    min_dimension: int = 1000,
    apply_threshold: bool = True,
) -> np.ndarray:
    """Run the full preprocessing pipeline and return a 3-channel image.

    PaddleOCR expects a 3-channel (BGR) array, so the single-channel result is
    converted back before returning.
    """
    gray = to_grayscale(image)
    gray = denoise(gray)
    gray = deskew(gray)
    gray = resize_if_low_res(gray, min_dimension)
    processed = adaptive_threshold(gray) if apply_threshold else gray
    return cv2.cvtColor(processed, cv2.COLOR_GRAY2BGR)
