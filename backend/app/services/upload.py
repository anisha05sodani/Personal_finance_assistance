import pdfplumber
import pytesseract
from PIL import Image
import io
import re
from datetime import datetime
from fastapi import UploadFile, HTTPException
import invoice2data
from invoice2data.extract.loader import read_templates
from invoice2data import extract_data
import tempfile
import os

class UploadService:
    @staticmethod
    def parse_with_invoice2data(file_bytes, filename):
        # Save file to a temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        # Use built-in templates and a custom template for common fields
        templates = read_templates()
        # Add a simple inline template for demonstration
        custom_template = {
            'keywords': ['Invoice', 'Total'],
            'fields': [
                {'name': 'date', 'type': 'date', 'required': True, 'patterns': [r'Invoice Date[:\s]*([0-9]{2}/[0-9]{2}/[0-9]{4})']},
                {'name': 'amount', 'type': 'number', 'required': True, 'patterns': [r'Total[:\s\$]*([0-9,]+[.,][0-9]{2})']},
                {'name': 'invoice_number', 'type': 'string', 'required': False, 'patterns': [r'Invoice #\s*([0-9]+)']}
            ]
        }
        templates.append(custom_template)
        result = extract_data(tmp_path, templates=templates)
        os.unlink(tmp_path)
        if result and result.get('date') and result.get('amount'):
            return {
                'date': result['date'],
                'amount': result['amount'],
                'category': 'others',
                'description': f"Invoice #{result.get('invoice_number', '')}".strip(),
                'type': 'expense'
            }
        return None

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
            # Fallback: if no tables, try to extract text and parse transaction
            if not data:
                text = " ".join(page.extract_text() or '' for page in pdf.pages)
                tx = UploadService.parse_transaction_from_text(text)
                if not tx:
                    # Try invoice2data as fallback
                    tx = UploadService.parse_with_invoice2data(contents, file.filename)
                if tx:
                    data.append(tx)
        return data

    @staticmethod
    async def extract_from_receipt(file: UploadFile):
        contents = await file.read()
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")
        text = pytesseract.image_to_string(image)
        tx = UploadService.parse_transaction_from_text(text)
        if not tx:
            # Try invoice2data as fallback
            tx = UploadService.parse_with_invoice2data(contents, file.filename)
        if tx:
            return tx
        return {"text": text}

    @staticmethod
    def parse_transaction_from_text(text):
        # Prefer date after 'Invoice Date:'
        date_match = re.search(r"Invoice Date[:\s]*([0-9]{2}[-/][0-9]{2}[-/][0-9]{4}|[0-9]{4}[-/][0-9]{2}[-/][0-9]{2})", text, re.IGNORECASE)
        if date_match:
            date = date_match.group(1)
        else:
            date_match = re.search(r"(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})", text)
            date = date_match.group(1) if date_match else ""
        # Prefer amount after 'Total' or 'Total:'
        amount_match = re.search(r"Total[:\s\$]*([0-9,]+[.,][0-9]{2})", text, re.IGNORECASE)
        if amount_match:
            amount = amount_match.group(1).replace(",", "")
        else:
            amount_match = re.search(r"([0-9]+[.,][0-9]{2})", text)
            amount = amount_match.group(1).replace(",", ".") if amount_match else ""
        # Prefer description after 'Invoice #' if present
        desc_match = re.search(r"Invoice #\s*([0-9]+)", text, re.IGNORECASE)
        if desc_match:
            description = f"Invoice #{desc_match.group(1)}"
        else:
            desc_match = re.search(r"description[:\-]?\s*(.*)", text, re.IGNORECASE)
            description = desc_match.group(1).strip() if desc_match else text.strip().split("\n")[0]
        # Try to extract category (look for keywords)
        categories = ["food", "groceries", "transport", "shopping", "utilities", "rent", "salary", "others"]
        category = next((cat for cat in categories if cat in text.lower()), "others")
        # Only return if at least amount and date are found
        if amount and date:
            return {
                "date": date,
                "amount": amount,
                "category": category,
                "description": description,
                "type": "expense"
            }
        return None 