# OCR & Image Understanding Service

A production-ready OCR microservice built with **FastAPI** and **PaddleOCR**. It
accepts image/PDF uploads, preprocesses them with OpenCV, runs OCR, and returns
both the plain extracted text and structured layout data (per-block confidence
and bounding boxes), with nearby lines merged into paragraphs.

## Features

- REST API (`POST /extract-text`) with `multipart/form-data` upload
- Accepts **JPG, JPEG, PNG, WEBP, PDF**
- OpenCV preprocessing: grayscale → denoise → deskew → resize (upscale low-res) → adaptive threshold
- PaddleOCR engine (English by default, easily extensible to other languages)
- Reading-order preservation (top→bottom, left→right)
- Confidence score + 4-point bounding box for every text block
- Nearby lines merged into paragraphs
- Plain text **and** structured JSON output
- File size & type validation, correct HTTP status codes, full exception handling
- Async endpoint; OCR runs in a worker thread for concurrency
- **Model loads once at startup** (singleton) — never reloaded per request
- Structured logging: request id, processing time, image dimensions, failures
- Importable `extract_text(image_path)` function for non-API use
- pytest unit tests + Dockerfile

## Project structure

```
ocr-service/
├── app/
│   ├── main.py                # FastAPI app, lifespan model-load, middleware, /health
│   ├── config.py              # Pydantic settings (env-overridable)
│   ├── routes/
│   │   └── ocr.py             # POST /extract-text
│   ├── services/
│   │   └── ocr_service.py     # PaddleOCR singleton + parsing + extract_text()
│   ├── utils/
│   │   └── preprocessing.py   # OpenCV pipeline + image/PDF decoding
│   ├── schemas/
│   │   └── response.py        # Pydantic response models
│   └── models/                # (placeholder for future entities)
├── tests/
│   └── test_ocr.py            # pytest unit + API tests
├── requirements.txt
├── Dockerfile
└── README.md
```

## Installation

```bash
cd ocr-service
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Linux/mac: source .venv/bin/activate
pip install -r requirements.txt
```

> The first run downloads the PaddleOCR model weights automatically (cached afterwards).

## Run the API

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Interactive docs: http://localhost:8000/docs · Health: http://localhost:8000/health

## API

### `POST /extract-text`

Form field: `file` (the image or PDF).

**Sample curl — image:**

```bash
curl -X POST http://localhost:8000/extract-text \
  -F "file=@receipt.jpg"
```

**Sample curl — PDF:**

```bash
curl -X POST http://localhost:8000/extract-text \
  -F "file=@invoice.pdf"
```

**Sample response:**

```json
{
  "success": true,
  "full_text": "SHOP NAME\nTotal 16.50",
  "blocks": [
    {
      "text": "SHOP NAME",
      "confidence": 0.98,
      "bounding_box": [[10, 10], [200, 10], [200, 40], [10, 40]]
    }
  ],
  "paragraphs": [
    {
      "text": "SHOP NAME",
      "confidence": 0.98,
      "blocks": [ ... ]
    }
  ],
  "image_dimensions": { "width": 800, "height": 1200 },
  "num_pages": 1,
  "processing_time_ms": 412.7,
  "request_id": "f3a1..."
}
```

**Status codes:** `200` OK · `400` empty file · `413` too large · `415` unsupported type · `422` unreadable image · `500` OCR failure.

## Use as a library (no API)

```python
from app.services.ocr_service import extract_text

result = extract_text("receipt.jpg")
print(result["full_text"])
for block in result["blocks"]:
    print(round(block["confidence"], 2), block["text"])
```

## Configuration

All settings are overridable via environment variables prefixed with `OCR_`
(or a `.env` file):

| Variable | Default | Description |
|----------|---------|-------------|
| `OCR_LANG` | `en` | PaddleOCR language (e.g. `ch`, `fr`, `de`) |
| `OCR_USE_GPU` | `false` | Use GPU inference |
| `OCR_USE_ANGLE_CLS` | `true` | Enable rotation/angle classifier |
| `OCR_EAGER_LOAD` | `true` | Load the model at startup |
| `OCR_MAX_FILE_SIZE_MB` | `10` | Max upload size |
| `OCR_MIN_DIMENSION` | `1000` | Upscale images whose smallest side is below this |
| `OCR_APPLY_THRESHOLD` | `true` | Apply adaptive thresholding before OCR |
| `OCR_PARAGRAPH_Y_GAP_RATIO` | `1.6` | Line-gap multiplier for paragraph merging |
| `OCR_PDF_RENDER_DPI` | `200` | DPI used when rasterising PDF pages |
| `OCR_LOG_LEVEL` | `INFO` | Log level |

## Testing

```bash
pip install -r requirements.txt
pytest -q
```

The tests mock the OCR engine, so they run without downloading model weights
(OpenCV and NumPy are still required).

## Docker

```bash
docker build -t ocr-service .
docker run --rm -p 8000:8000 ocr-service
```

## Performance & concurrency notes

- The PaddleOCR model is wrapped in a thread-safe singleton and loaded **once**
  (at startup when `OCR_EAGER_LOAD=true`, otherwise on first request).
- The endpoint is `async`; the CPU-bound OCR call runs in a worker thread
  (`run_in_threadpool`) so the event loop stays responsive under concurrent load.
- Inference is guarded by a lock because the predictor is not guaranteed to be
  thread-safe; scale horizontally (more workers/replicas) for higher throughput.
