import pdfplumber
import pytesseract
from PIL import Image
import io
from fastapi import UploadFile, HTTPException

class UploadService:
    @staticmethod
    async def extract_from_pdf(file: UploadFile):
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        data = []
        contents = await file.read()
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                table = page.extract_table()
                if table:
                    headers = table[0]
                    for row in table[1:]:
                        data.append(dict(zip(headers, row)))
        return data

    @staticmethod
    async def extract_from_receipt(file: UploadFile):
        contents = await file.read()
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")
        text = pytesseract.image_to_string(image)
        return {"text": text} 