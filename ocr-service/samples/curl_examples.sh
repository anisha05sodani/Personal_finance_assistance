#!/usr/bin/env bash
# Sample curl requests for the OCR service.
# Start the API first:  uvicorn app.main:app --host 0.0.0.0 --port 8000

BASE_URL="${BASE_URL:-http://localhost:8000}"

# 1) Health check
curl -s "${BASE_URL}/health" | jq

# 2) Extract text from an image (JPG/PNG/WEBP)
curl -s -X POST "${BASE_URL}/extract-text" \
  -F "file=@receipt.jpg" | jq

# 3) Extract text from a PDF
curl -s -X POST "${BASE_URL}/extract-text" \
  -F "file=@invoice.pdf" | jq

# 4) Unsupported type -> 415
curl -s -o /dev/null -w "%{http_code}\n" -X POST "${BASE_URL}/extract-text" \
  -F "file=@notes.txt"
