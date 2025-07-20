from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
import pytesseract
import io
from ..services.upload import UploadService
import os

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    data = await UploadService.extract_from_pdf(file)
    return {"data": data}

@router.post("/receipt")
async def extract_text_from_receipt(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        extracted_text = pytesseract.image_to_string(image)
        return {"extracted_text": extracted_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 