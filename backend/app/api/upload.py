from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from ..services.upload import UploadService
from .deps import get_current_user
from ..models.user import User

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Parse PDF file and extract transaction data"""
    data = await UploadService.extract_from_pdf(file)
    return {"data": data}

@router.post("/receipt")
async def extract_from_receipt(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Parse receipt image using OCR and extract transaction data"""
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")
    result = await UploadService.extract_from_receipt(file)
    tx = result.get("transaction")
    details = result.get("details", {})
    text = result.get("text", "")

    if tx:
        return {"data": tx, "details": details, "text": text, "parsed": True}

    # OCR couldn't build a confident transaction; pre-fill from the receipt details.
    return {
        "data": {
            "date": details.get("date", ""),
            "amount": details.get("total", ""),
            "category": "others",
            "description": details.get("merchant", ""),
            "type": "expense",
        },
        "details": details,
        "text": text,
        "parsed": False,
    } 