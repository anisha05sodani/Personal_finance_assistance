# 💰 Personal Finance Assistant

[![Backend CI](https://github.com/<your-username>/<your-repo>/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/<your-username>/<your-repo>/actions/workflows/backend-ci.yml)

A full-stack personal finance management app: track income & expenses, set budgets,
visualize spending, scan receipts with OCR, and chat with an AI assistant about your
finances.

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** FastAPI + SQLAlchemy (SQLite by default, PostgreSQL optional)
- **AI:** Pluggable LLM (Groq / Anthropic Claude / local Ollama) with rule-based fallback
- **OCR:** Tesseract (in the backend) + an optional standalone PaddleOCR microservice

---

## ✨ Features
- User authentication (JWT)
- Add, edit, delete and filter transactions
- Custom categories and monthly budgets
- Dashboard with pie/bar charts and spending summaries
- Receipt & PDF upload with automatic data extraction (OCR)
- AI chat assistant and AI spending insights
- Export / print transactions
- Light & dark mode

---

## 📋 Prerequisites

Install these before you start:

| Tool | Version | Notes |
|------|---------|-------|
| **Python** | 3.10+ | Backend runtime |
| **Node.js** | 18+ | Frontend (comes with npm) |
| **Git** | any | To clone the repo |
| **Tesseract OCR** | optional | Only needed for receipt scanning |

> The app works **without** Tesseract and **without** an AI key — those features
> simply fall back gracefully.

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone <your-repo-url>
cd Personal_finance_assistance-main

# 2. Backend (terminal 1)
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env        # Windows  (macOS/Linux: cp .env.example .env)
uvicorn app.main:app --reload --port 8000

# 3. Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173** and register an account.
API docs are at **http://localhost:8000/docs**.

---

## 🔧 Backend Setup (detailed)

1. **Create & activate a virtual environment** (from the `backend/` folder):
   ```bash
   python -m venv .venv
   .venv\Scripts\activate          # Windows
   source .venv/bin/activate        # macOS/Linux
   ```
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Create your environment file:**
   ```bash
   copy .env.example .env           # Windows
   cp .env.example .env             # macOS/Linux
   ```
   Then open `backend/.env` and set a strong `SECRET_KEY`. Generate one with:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
4. **(Optional) Install Tesseract** for receipt OCR:
   - **Windows:** install from <https://github.com/UB-Mannheim/tesseract/wiki> and
     add the install folder to your `PATH` (or set `TESSERACT_CMD` in `.env`).
   - **macOS:** `brew install tesseract`
   - **Linux:** `sudo apt install tesseract-ocr`
5. **Run the server** (from the `backend/` folder):
   ```bash
   uvicorn app.main:app --reload --port 8001
   ```
   The SQLite database (`finance.db`) and tables are created automatically on first run.

   **Launching from the project root instead?** The `app` package lives in
   `backend/`, so add `--app-dir backend`:
   ```bash
   # run from the repository root
   uvicorn app.main:app --reload --app-dir backend --port 8001
   ```

   > ⚠️ **SQLite path gotcha:** the default `DATABASE_URL=sqlite:///./finance.db`
   > uses a path relative to the folder you launch from, so starting the server
   > from `backend/` vs. the repo root would create **different** database files.
   > To always use one database, set an **absolute** path in `backend/.env`, e.g.
   > `DATABASE_URL=sqlite:///C:/full/path/to/finance.db`. The built-in default
   > already resolves to an absolute `backend/finance.db` when `DATABASE_URL` is
   > left unset.

### Backend environment variables (`backend/.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENVIRONMENT` | `development` | Set to `production` to enable strict security checks |
| `DATABASE_URL` | absolute `backend/finance.db` | Prefer an absolute path (or a PostgreSQL URL for production) — see the SQLite path gotcha above |
| `SECRET_KEY` | _(change it!)_ | JWT signing key — **must** be changed for production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token lifetime |
| `FRONTEND_URL` / `CORS_ORIGINS` | localhost:5173 | Allowed CORS origins |

---

## 🤖 AI Assistant Setup (optional)

> **Why isn't my key on GitHub?** The real `backend/.env` is git-ignored so your secret
> key is never published. It still works locally — the app reads `.env` from disk. Anyone
> who clones the repo copies `.env.example` → `.env` and pastes **their own** key. The
> `.gitignore` only controls what gets *uploaded*, not what runs on your machine.

The AI chat & insights work with several providers. Edit `backend/.env` and pick **one**.
If none is set, the app uses built-in rule-based answers.

```ini
# Option A — Groq (free key, fast).  Key: https://console.groq.com/keys
AI_PROVIDER=openai
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_your_key_here
AI_MODEL=llama-3.3-70b-versatile

# Option B — Anthropic Claude (paid).  Key: https://console.anthropic.com/settings/keys
# AI_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-your_key_here
# ANTHROPIC_MODEL=claude-3-5-haiku-latest

# Option C — Ollama (local, free, no key).  Install https://ollama.com then `ollama pull llama3.1`
# AI_PROVIDER=openai
# AI_BASE_URL=http://localhost:11434/v1
# AI_MODEL=llama3.1
```

Restart the backend after changing `.env`. Verify with `GET /ai/status` → `{"available": true}`.

---

## 🎨 Frontend Setup (detailed)

1. From the `frontend/` folder, install dependencies:
   ```bash
   npm install
   ```
2. **(Optional)** If your backend runs on a non-default port, create `frontend/.env`:
   ```bash
   cp .env.example .env
   # then set VITE_API_URL=http://localhost:8001  (for example)
   ```
   By default the frontend talks to `http://localhost:8000`.
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open <http://localhost:5173>.

To create a production build: `npm run build` (output in `frontend/dist/`).

---

## 🧾 Optional: Standalone OCR Microservice

`ocr-service/` is an independent FastAPI + PaddleOCR service. **It is optional** — the
main backend already does its own OCR with Tesseract. Run it only if you want to use
PaddleOCR separately:

```bash
cd ocr-service
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8002
```

---

## 📂 Project Structure

```
backend/      FastAPI app (API, services, models, schemas)
frontend/     React + Vite app
ocr-service/  Optional standalone PaddleOCR microservice
```

---

## 🧪 Running the backend tests

The backend ships with a `pytest` suite (auth, transactions, budgets, categories,
stats, the upload parsers and the AI fallback logic). Tests use a throwaway SQLite
database and never touch `finance.db`, and they make **no network calls** (the AI
layer runs its rule-based fallback).

```bash
cd backend
pip install -r requirements-dev.txt          # pytest, pytest-cov, httpx + app deps
pytest                                        # run the suite
pytest --cov=app --cov-report=term-missing    # with a coverage report
```

Every push and pull request runs these tests automatically via GitHub Actions
(see `.github/workflows/backend-ci.yml`). Update the badge URL at the top of this
file with your GitHub `username/repo` once you push.

---

## �️ Troubleshooting

**`[WinError 10013] ... socket ... forbidden` or `address already in use` on startup**
Port `8000` is already taken by another program. Run the backend on a different
port and point the frontend at it:

```bash
# backend (terminal 1)
uvicorn app.main:app --reload --port 8001

# frontend (terminal 2) — create frontend/.env.local with:
#   VITE_API_URL=http://localhost:8001
npm run dev
```

The frontend defaults to `http://localhost:8000`; setting `VITE_API_URL` in a
`frontend/.env` or `frontend/.env.local` file overrides it. Restart `npm run dev`
after changing it. (CORS already allows the frontend on `localhost:5173`, so only
the API port needs to match.)

**`ModuleNotFoundError: No module named 'pydantic_settings'`**
Your virtualenv is missing a dependency — install (or reinstall) the requirements
from the `backend/` folder: `pip install -r requirements.txt`.

**Registration/login fails with a connection error**
The backend isn't running, or the frontend is pointing at the wrong port. Confirm
the API is up (open `http://localhost:8000/docs`, or `:8001`) and that
`VITE_API_URL` matches the port the backend is actually using.

---

## �📦 Capturing dependencies

The repo already ships curated dependency files:
- `backend/requirements.txt`
- `frontend/package.json`
- `ocr-service/requirements.txt`

To regenerate an exact backend lock file from your active virtualenv:
```bash
cd backend
pip freeze > requirements.lock.txt
```

---

## 📤 Uploading to GitHub (clean, no junk)

A root `.gitignore` already excludes everything that should **not** be committed
(virtualenvs, `node_modules/`, `__pycache__/`, the SQLite DB, `.env` secrets, logs, build
output, OCR model caches). To publish:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

> ⚠️ **Never commit your real `.env`** — only `.env.example` is tracked. If you ever
> committed an API key, rotate it immediately.

### If you specifically want a ZIP (excluding junk)
After `git init && git add . && git commit`, run:
```bash
git archive --format=zip -o personal-finance-assistant.zip HEAD
```
This zips only the tracked files (respecting `.gitignore`).

---

## License
MIT
