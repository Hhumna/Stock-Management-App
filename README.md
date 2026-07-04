# Stock Management System

A full-stack inventory and stock management application built with **Flask 3** (REST API) and **React 18 + Vite** (frontend).

---

## Project Structure

```
stock-management-app/
├── backend/                  # Flask REST API
│   ├── app/
│   │   ├── __init__.py       # Application factory (create_app)
│   │   ├── extensions.py     # db, jwt, migrate, cors singletons
│   │   ├── models/           # SQLAlchemy models (one file per model)
│   │   ├── routes/           # Flask blueprints (one per resource)
│   │   │   ├── health.py     # GET /api/health
│   │   │   ├── auth.py
│   │   │   ├── products.py
│   │   │   ├── categories.py
│   │   │   ├── suppliers.py
│   │   │   └── transactions.py
│   │   ├── schemas/          # Marshmallow schemas
│   │   └── utils/            # Helpers: pagination, response formatting
│   ├── config.py             # Dev / Test / Prod config classes
│   ├── .env                  # Local secrets (never commit)
│   ├── .env.example          # Template for new contributors
│   ├── requirements.txt
│   └── run.py                # Entry point
│
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── components/       # Shared UI components (AppShell)
│   │   ├── context/          # AuthContext.jsx
│   │   ├── hooks/            # Custom React hooks
│   │   ├── pages/            # Route-level pages (Dashboard, …)
│   │   ├── services/         # api.js (Axios instance + interceptors)
│   │   ├── utils/            # Helper functions
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css         # Global design system
│   ├── .env                  # VITE_API_BASE_URL
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## Prerequisites

| Tool | Minimum version |
|------|-----------------|
| Python | 3.11+ |
| pip | 23+ |
| Node.js | 18+ |
| npm | 9+ |

---

## 1 — Backend Setup

```bash
# Navigate to the backend directory
cd stock-management-app/backend

# (Recommended) Create and activate a virtual environment
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy the environment template and fill in your values
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

### Run the backend

```bash
# From backend/ directory, with the venv activated
flask run --host=0.0.0.0
```

The API will start on **http://localhost:5000**.

> **Alternative:** `python run.py`

### Database initialisation (first time only)

```bash
flask db init      # create migrations/ folder
flask db migrate -m "Initial migration"
flask db upgrade   # apply migrations → creates instance/stock.db
```

---

## 2 — Frontend Setup

```bash
# Navigate to the frontend directory
cd stock-management-app/frontend

# Install dependencies
npm install

# Run the dev server
npm run dev
```

The app will start on **http://localhost:5173**.

---

## 3 — Verify the Health Endpoint

### Method A — curl (local)

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"message": "Stock Management API is running", "status": "ok"}
```

### Method B — Postman

1. Open Postman
2. Create a new **GET** request
3. URL: `http://localhost:5000/api/health`
4. Click **Send**
5. Expect **200 OK** with the JSON body above

### Method C — Direct IP from another device on the same LAN

1. Find your local IP address:
   ```bash
   # Windows
   ipconfig
   # Look for "IPv4 Address" under your active adapter, e.g. 192.168.1.42

   # macOS / Linux
   ifconfig | grep "inet "
   ```

2. From **another device** on the same Wi-Fi/LAN, run:
   ```bash
   curl http://192.168.1.42:5000/api/health
   ```
   Replace `192.168.1.42` with your actual IP.

3. You should receive the same `{"status": "ok"}` response.

> **Why does this work?** The backend is started with `--host=0.0.0.0`, which binds Flask to all network interfaces. In development mode, CORS is also set to `origins="*"` so the frontend can reach it from any origin.

---

## 4 — Switching to PostgreSQL

In `backend/.env`, change the `DATABASE_URL` line:

```dotenv
# SQLite (default, development)
DATABASE_URL=sqlite:///instance/stock.db

# PostgreSQL (one-line change)
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/stock_db
```

Then re-run `flask db upgrade`.

---

## 5 — Locking Down CORS for Production

> **⚠️ Warning:** The development config sets `CORS origins="*"`. This is **not safe for production.**

In `backend/.env` (or your production environment), set:

```dotenv
FLASK_ENV=production
CORS_ORIGINS=https://your-frontend-domain.com
```

`ProductionConfig` reads `CORS_ORIGINS` and passes only those exact origins to Flask-CORS. Also ensure:

- `SECRET_KEY` and `JWT_SECRET_KEY` are long random strings (e.g., `python -c "import secrets; print(secrets.token_hex(32))"`)
- `DATABASE_URL` points to a managed Postgres instance
- The server is behind a reverse proxy (Nginx/Caddy) with HTTPS

---

## 6 — Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_ENV` | `development` / `production` / `testing` | `development` |
| `FLASK_APP` | Entry module for the Flask CLI | `run.py` |
| `SECRET_KEY` | Flask session secret | *(must be set)* |
| `JWT_SECRET_KEY` | JWT signing secret | *(must be set)* |
| `DATABASE_URL` | SQLAlchemy connection string | SQLite path |
| `CORS_ORIGINS` | Comma-separated allowed origins | `localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Base URL of the Flask API | `http://localhost:5000/api` |

---

## 7 — Available API Endpoints (current)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness check — returns `{"status":"ok"}` |
| `GET` | `/api/auth/` | Auth stub (501) |
| `GET` | `/api/products/` | Products stub (501) |
| `GET` | `/api/categories/` | Categories stub (501) |
| `GET` | `/api/suppliers/` | Suppliers stub (501) |
| `GET` | `/api/transactions/` | Transactions stub (501) |

> All stubs will return `501 Not Implemented` until business logic is added in future iterations.

---

## 8 — Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11 · Flask 3.x · Flask-SQLAlchemy · Flask-Migrate · Flask-JWT-Extended · Flask-CORS · Marshmallow |
| Frontend | React 18 · Vite 5 · React Router DOM · Axios · Recharts · Lucide React · React Hot Toast |
| Database | SQLite (dev) → PostgreSQL (prod) |
| Auth | JWT (access tokens in `localStorage`) |
