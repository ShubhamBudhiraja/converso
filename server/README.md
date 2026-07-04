# Converso Server

FastAPI backend for Converso with JWT auth, multi-session support, and PostgreSQL.

## Prerequisites

- Python 3.9+
- PostgreSQL (local or remote)
- A PostgreSQL database created for the app (e.g. `converso_db`)

## Setup

1. **Go to the server directory**

```bash
cd server
```

2. **Create and activate a virtual environment** (recommended)

```bash
python3 -m venv venv
source venv/bin/activate   # macOS/Linux
# venv\Scripts\activate    # Windows
```

3. **Install dependencies**

```bash
pip install -r requirements.txt
```

4. **Create a `.env` file** in the `server/` directory:

```env
DATABASE_URL=postgresql://YOUR_USER@localhost/converso_db
JWT_SECRET_KEY=your-long-random-secret

# Optional
FRONTEND_URL=http://localhost:3000
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
PASSWORD_RESET_EXPIRE_HOURS=1
```

Replace `YOUR_USER` and database name with your local Postgres credentials. Generate a strong `JWT_SECRET_KEY` (e.g. `openssl rand -hex 32`).

## Start the backend

From the `server/` directory:

```bash
python3 -m uvicorn app.main:app --reload
```

The API runs at [http://127.0.0.1:8000](http://127.0.0.1:8000).

- **Interactive docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health check:** open the docs page or any auth endpoint

> Run uvicorn from inside `server/` so the `app` package resolves correctly. If `uvicorn` is not found, use `python3 -m uvicorn` as shown above.

Tables are created automatically on startup via SQLAlchemy (`users`, `sessions`, `password_reset_tokens`).

## Auth endpoints

All routes are prefixed with `/api/v1/auth`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/signup` | Create account, returns access + refresh tokens |
| `POST` | `/login` | Log in (creates a new session per device) |
| `POST` | `/refresh` | Get a new access token using a refresh token |
| `POST` | `/logout` | Revoke the current session only |
| `POST` | `/forgot-password` | Request a password reset link |
| `POST` | `/reset-password` | Reset password with token from email |
| `GET` | `/me` | Get current user (requires `Authorization: Bearer <access_token>`) |

### Multi-session behavior

Each login creates a separate session in the database. Logging in on desktop does not log out mobile. Logout only ends the session for the refresh token you send.

Password reset revokes all active sessions for security.

### Forgot password (dev)

Reset links are logged to the server console until email delivery is configured. Check terminal output after calling `/forgot-password`.

## Project structure

```
server/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── api/v1/              # Route handlers
│   ├── core/security.py     # JWT, hashing, tokens
│   ├── database/            # SQLAlchemy engine & session
│   ├── models/              # DB models
│   ├── schemas/             # Pydantic request/response models
│   └── services/            # Business logic
├── requirements.txt
└── .env                     # Local env (not committed)
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `uvicorn: command not found` | Use `python3 -m uvicorn app.main:app --reload` |
| `Expected string or URL object, got None` | Add `DATABASE_URL` to `.env` |
| `relation "users" does not exist` | Restart the server so tables are created on startup |
| CORS errors from client | Client must run on `http://localhost:3000` (configured in `main.py`) |
