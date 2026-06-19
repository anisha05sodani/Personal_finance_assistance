import pdfplumber
import pytesseract
from PIL import Image
import io
import re
import shutil
import logging
from datetime import datetime
from fastapi import UploadFile, HTTPException
import invoice2data
from invoice2data.extract.loader import read_templates
from invoice2data import extract_data
import tempfile
import os

logger = logging.getLogger(__name__)


def _configure_tesseract():
    """Locate the Tesseract OCR engine so pytesseract can find it.

    Honours the TESSERACT_CMD env var, then falls back to the binary on PATH,
    then to common install locations on Windows/macOS/Linux.
    """
    candidates = [
        os.environ.get("TESSERACT_CMD"),
        shutil.which("tesseract"),
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        "/opt/homebrew/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/usr/bin/tesseract",
    ]
    for path in candidates:
        if path and os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            return path
    return None


_TESSERACT_PATH = _configure_tesseract()

# Maximum accepted upload size (bytes). Guards against memory/disk exhaustion.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def _read_within_limit(contents: bytes) -> None:
    """Reject empty or oversized uploads before any heavy processing."""
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )


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
        try:
            result = extract_data(tmp_path, templates=templates)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
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
        _read_within_limit(contents)
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
                    # Try invoice2data as fallback (PDF only; never let it crash the request)
                    try:
                        tx = UploadService.parse_with_invoice2data(contents, file.filename)
                    except Exception:
                        tx = None
                if tx:
                    data.append(tx)
        return data

    @staticmethod
    async def extract_from_receipt(file: UploadFile):
        contents = await file.read()
        _read_within_limit(contents)
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")
        try:
            text = pytesseract.image_to_string(image)
        except pytesseract.TesseractNotFoundError:
            raise HTTPException(
                status_code=503,
                detail="OCR engine (Tesseract) is not installed on the server. "
                       "Install it to enable receipt scanning.",
            )
        except Exception:
            raise HTTPException(status_code=422, detail="Could not read text from the image.")
        tx = UploadService.parse_transaction_from_text(text)
        details = UploadService.extract_receipt_details(text)

        # Optional AI enhancement: refine category/description/amount when an LLM
        # is configured. Falls back silently to the rule-based result otherwise.
        ai_result = None
        try:
            from .ai import AIService

            ai_result = AIService.categorize_receipt(text)
        except Exception:
            logger.warning("AI receipt categorization failed; using rule-based result.", exc_info=True)
            ai_result = None

        if ai_result:
            if tx is None:
                tx = {"type": "expense"}
            if ai_result.get("category"):
                tx["category"] = ai_result["category"]
            if ai_result.get("description"):
                tx["description"] = ai_result["description"]
            if ai_result.get("amount"):
                try:
                    tx["amount"] = float(ai_result["amount"])
                except (TypeError, ValueError):
                    pass
            if ai_result.get("date"):
                tx["date"] = ai_result["date"]
            tx["ai_categorized"] = True
        elif tx is not None:
            tx["ai_categorized"] = False

        return {"transaction": tx, "details": details, "text": text}

    @staticmethod
    def extract_receipt_details(text):
        """Extract a rich, human-readable breakdown of a receipt from OCR text.

        Returns the merchant, date, line items, subtotal/tax/total and the
        detected payment method so the UI can show the full receipt details.
        """
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

        # Merchant: the first meaningful line (usually the store/business name).
        merchant = ""
        for ln in lines[:6]:
            letters = sum(c.isalpha() for c in ln)
            if letters >= 3 and not re.search(r"receipt|invoice|tax|gst", ln, re.IGNORECASE):
                merchant = ln
                break
        if not merchant and lines:
            merchant = lines[0]

        def find_amount(labels):
            pattern = r"(?<![A-Za-z])(?:%s)[:\s\$\u20b9]*([0-9][0-9,]*(?:[.,][0-9]{1,2})?)" % "|".join(labels)
            m = re.search(pattern, text, re.IGNORECASE)
            return m.group(1).replace(",", "") if m else ""

        total = find_amount([r"Grand\s+Total", r"Total\s+Due", r"Total", r"Amount\s+Due", r"Balance\s+Due"])
        subtotal = find_amount([r"Sub[-\s]*total"])
        tax = find_amount([r"Tax", r"GST", r"VAT"])

        # Date (labelled date preferred, then any date-like token).
        date_match = re.search(
            r"(?:Invoice |Receipt )?Date[:\s]*([0-9]{2}[-/][0-9]{2}[-/][0-9]{4}|[0-9]{4}[-/][0-9]{2}[-/][0-9]{2})",
            text, re.IGNORECASE,
        )
        if not date_match:
            date_match = re.search(r"(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})", text)
        date = date_match.group(1) if date_match else ""

        # Time, if present.
        time_match = re.search(r"\b([0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?\s*(?:AM|PM)?)\b", text, re.IGNORECASE)
        time = time_match.group(1).strip() if time_match else ""

        # Line items: lines ending in a price, excluding summary rows.
        items = []
        skip = re.compile(r"total|subtotal|sub-total|tax|gst|vat|balance|change|cash|card|due|tender|visa|master", re.IGNORECASE)
        for ln in lines:
            m = re.search(r"^(.*?\D)\s*\$?\u20b9?\s*([0-9]+[.,][0-9]{2})$", ln)
            if m:
                name = m.group(1).strip(" .-:\t")
                if name and not skip.search(name):
                    items.append({"name": name, "price": m.group(2).replace(",", "")})

        # Payment method.
        pm_match = re.search(r"\b(VISA|MASTERCARD|MASTER\s*CARD|AMEX|CASH|CREDIT|DEBIT|PAYPAL|UPI)\b", text, re.IGNORECASE)
        payment_method = pm_match.group(1).upper().replace("  ", " ") if pm_match else ""

        return {
            "merchant": merchant,
            "date": date,
            "time": time,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "items": items,
            "payment_method": payment_method,
        }

    @staticmethod
    def parse_transaction_from_text(text):
        # Date: prefer a labelled date, then any date-like token in the text
        date_match = re.search(
            r"(?:Invoice |Receipt )?Date[:\s]*([0-9]{2}[-/][0-9]{2}[-/][0-9]{4}|[0-9]{4}[-/][0-9]{2}[-/][0-9]{2})",
            text, re.IGNORECASE,
        )
        if date_match:
            date = date_match.group(1)
        else:
            date_match = re.search(r"(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})", text)
            date = date_match.group(1) if date_match else ""

        # Amount: prefer the value next to a Total/Amount label, allowing 0-2 decimals
        amount = ""
        label_match = re.search(
            r"(?<![A-Za-z])(?:Grand\s+Total|Total|Amount(?:\s+Due)?|Balance\s+Due)[:\s\$\u20b9]*"
            r"([0-9][0-9,]*(?:[.,][0-9]{1,2})?)",
            text, re.IGNORECASE,
        )
        if label_match:
            amount = label_match.group(1)
        else:
            # Fall back to the largest decimal number found in the text
            nums = re.findall(r"[0-9][0-9,]*[.,][0-9]{1,2}", text)
            if nums:
                amount = max(nums, key=lambda n: float(n.replace(",", "")))
        amount = amount.replace(",", "") if amount else ""

        # Description
        desc_match = re.search(r"Invoice #\s*([0-9]+)", text, re.IGNORECASE)
        if desc_match:
            description = f"Invoice #{desc_match.group(1)}"
        else:
            desc_match = re.search(r"description[:\-]?\s*(.*)", text, re.IGNORECASE)
            description = desc_match.group(1).strip() if desc_match else text.strip().split("\n")[0]

        # Try to extract category (look for keywords)
        categories = ["food", "groceries", "transport", "shopping", "utilities", "rent", "salary", "others"]
        category = next((cat for cat in categories if cat in text.lower()), "others")

        # Require at least an amount; default the date to today when it can't be read
        if amount:
            if not date:
                date = datetime.now().strftime("%Y-%m-%d")
            return {
                "date": date,
                "amount": amount,
                "category": category,
                "description": description,
                "type": "expense",
            }
        return None 