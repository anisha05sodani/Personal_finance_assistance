# Finance App

A full-stack personal finance management application with a React frontend and FastAPI backend.

**[▶️ Watch Demo Video on Google Drive]

[YOUR_GOOGLE_DRIVE_LINK_HERE](https://drive.google.com/file/d/1s_u28MXiilwdmadD9PIQInwTsKQprp-G/view?usp=drive_link)**

## Features
- User authentication (JWT)
- Add, edit, and delete transactions
- Categorize transactions (e.g., Food, Rent, Salary, etc.)
- Visualize expenses by category (pie and bar charts)
- Filter transactions by type, category, and date
- Responsive, modern UI

## Setup Instructions

### Backend (FastAPI)
1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
2. **Enable CORS:**
   In `backend/app/main.py`, ensure you have:
   ```python
   from fastapi.middleware.cors import CORSMiddleware

   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # Or ["http://localhost:5173"]
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
   **Restart your backend server after making this change.**
3. **Run the backend:**
   ```bash
   uvicorn app.main:app --reload
   ```
4. **API Docs:**
   Visit [http://localhost:8000/docs](http://localhost:8000/docs) for Swagger UI.

### Frontend (React)
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run the frontend:**
   ```bash
   npm run dev
   ```
3. **Visit:**
   [http://localhost:5173](http://localhost:5173)

## Project Structure
- `frontend/` - React app
- `backend/` - FastAPI app

## Advanced Features
- **Receipt/Invoice Upload & Parsing:** Upload images or PDFs of receipts. The backend uses Tesseract OCR and invoice2data to extract transaction details (date, amount, description, category). If parsing fails, you can enter details manually.
- **Export & Print:** On the Transactions page, you can print or export your transactions to PDF.
- **User Profile:** View your email and registration date on the Profile page.

## Backend Setup (Step-by-Step)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. (Optional, for OCR) Install Tesseract:
   - **Windows:** Download from https://github.com/tesseract-ocr/tesseract and add the install path to your system PATH.
   - **Linux/macOS:** Use your package manager (e.g., `sudo apt install tesseract-ocr`).
4. Run the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

## Frontend Setup (Step-by-Step)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the frontend dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage
- Register a new account or log in.
- Add, edit, and delete transactions.
- Upload receipts or invoices to auto-extract transaction details.
- View charts and summaries on the Dashboard.
- Print or export your transactions.
- View your profile information.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
MIT
