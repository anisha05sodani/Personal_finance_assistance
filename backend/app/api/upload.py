from fastapi import APIRouter, UploadFile, File
from ..services.upload import UploadService

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    data = await UploadService.extract_from_pdf(file)
    return {"data": data}

@router.post("/receipt")
async def upload_receipt(file: UploadFile = File(...)):
    data = await UploadService.extract_from_receipt(file)
    return {"data": data} 