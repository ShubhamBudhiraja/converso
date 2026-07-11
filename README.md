# Converso

AI-powered outbound calling platform for running phone campaigns, tracking call outcomes, and capturing leads from real conversations.

**Live app:** [https://converso-ruby-seven.vercel.app](https://converso-ruby-seven.vercel.app)  
**API docs:** [https://converso-0ig8.onrender.com/docs](https://converso-0ig8.onrender.com/docs)

---

## Overview

Converso lets you connect **Twilio** (telephony) and **ElevenLabs** (conversational AI), build **caller agents**, import **contact lists**, and run **outbound campaigns** that dial contacts automatically. Call status comes from Twilio webhooks; conversation summaries and lead data come from ElevenLabs post-call webhooks.

Built as a full-stack portfolio project demonstrating multi-service integration, background jobs, webhook-driven workflows, and production deployment.

---

## Features

- **Auth** — JWT + HttpOnly cookies, multi-session support, password reset
- **Telephone providers** — Connect multiple Twilio accounts, import/purchase numbers, register with ElevenLabs
- **AI providers** — Connect ElevenLabs accounts, create and manage conversational agents
- **Caller agents** — Bind a Twilio number + ElevenLabs agent into a dial-ready configuration
- **Contact lists** — CSV import with row-level validation, edit name, export CSV
- **Campaigns** — Schedule or manually start outbound campaigns; atomic start to prevent duplicate dials
- **Leads** — Auto-created from completed calls; filter by status, campaign, date range; search by name/phone
- **Dashboard** — Lead activity charts, monthly metrics, recent campaigns and leads
- **Resource guards** — Resources used by campaigns cannot be edited or deleted

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, Recharts |
| Backend | FastAPI, SQLAlchemy, PostgreSQL, APScheduler |
| Telephony | Twilio |
| Voice AI | ElevenLabs Conversational AI |
| Auth | JWT (access + refresh), bcrypt, encrypted credential storage |

---

## Architecture

```
Browser
   │
   ▼
Vercel (Next.js)  ──proxy──▶  Render (FastAPI)
   │                                │
   │                                ├── PostgreSQL
   │                                ├── APScheduler (campaign cron)
   │                                └── Background threads (dialing)
   │
   └── Cookies set on Vercel domain (same-origin auth)

External webhooks (hit API directly):
   Twilio  → POST /api/v1/webhooks/twilio/status
   ElevenLabs → POST /api/v1/webhooks/elevenlabs/post-call
```

**Campaign flow**

1. User creates a campaign with caller agent + contact lists + schedule
2. Scheduler or manual start triggers `execute_campaign`
3. Backend initiates outbound calls via ElevenLabs API (Twilio underneath)
4. Twilio sends call status updates → updates call records
5. ElevenLabs sends post-call transcription → creates/updates leads, completes campaign

---

## Deployment

| Service | URL | Role |
|---------|-----|------|
| **Frontend** | [converso-ruby-seven.vercel.app](https://converso-ruby-seven.vercel.app) | Next.js app (resume/demo link) |
| **Backend** | [converso-0ig8.onrender.com](https://converso-0ig8.onrender.com) | FastAPI API + scheduler |
| **Database** | Render PostgreSQL | Persistent data |

### Environment variables

**Render (API)**

```env
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=<random-hex>
ENCRYPTION_KEY=<random-hex>
FRONTEND_URL=https://converso-ruby-seven.vercel.app
WEBHOOK_BASE_URL=https://converso-0ig8.onrender.com
ELEVENLABS_WEBHOOK_SECRET=wsec_...
COOKIE_SECURE=true
```

**Vercel (client)**

```env
BACKEND_URL=https://converso-0ig8.onrender.com
```

Do **not** set `NEXT_PUBLIC_API_URL` on Vercel — the client proxies `/api/v1` through a Next.js route handler so auth cookies work on the Vercel domain.

### ElevenLabs webhook (manual setup)

In the ElevenLabs workspace dashboard:

- **URL:** `https://converso-0ig8.onrender.com/api/v1/webhooks/elevenlabs/post-call`
- **Secret:** same as `ELEVENLABS_WEBHOOK_SECRET`
- **Event:** enable `post_call_transcription`

Twilio status callbacks are configured automatically when a campaign starts.

---

## Local development

### Prerequisites

- Node.js 20+
- Python 3.9+
- PostgreSQL
- Twilio account
- ElevenLabs account
- ngrok (for local webhooks)

### Backend

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `server/.env`:

```env
DATABASE_URL=postgresql://YOUR_USER@localhost/converso_db
JWT_SECRET_KEY=your-secret
ENCRYPTION_KEY=your-encryption-key
FRONTEND_URL=http://localhost:3000
WEBHOOK_BASE_URL=https://YOUR_NGROK_URL
ELEVENLABS_WEBHOOK_SECRET=wsec_...
```

```bash
python3 -m uvicorn app.main:app --reload
```

API: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Frontend

```bash
cd client
npm install
```

Create `client/.env.local` (optional):

```env
BACKEND_URL=http://127.0.0.1:8000
```

```bash
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

### Local webhooks

```bash
ngrok http 8000
```

Set `WEBHOOK_BASE_URL` to the ngrok HTTPS root (no path). Configure the ElevenLabs workspace webhook with the full path shown above.

---

## Project structure

```
converso/
├── client/                 # Next.js frontend
│   ├── app/                # App Router pages
│   ├── components/         # UI and feature components
│   ├── lib/                # API client, auth, utilities
│   └── stores/             # Zustand state
├── server/                 # FastAPI backend
│   ├── app/
│   │   ├── api/v1/         # Route handlers
│   │   ├── models/         # SQLAlchemy models
│   │   ├── services/       # Business logic
│   │   └── core/           # Auth, cookies, config
│   └── requirements.txt
└── render.yaml             # Render deployment blueprint
```

---

## Is this a good use case of agentic AI?

**Short answer:** It is a strong **voice AI / conversational AI** project. It is **not** a classic **agentic AI orchestration** project in the LangChain / tool-calling / multi-agent sense.

| What Converso demonstrates | Agentic? |
|----------------------------|----------|
| ElevenLabs agents conducting autonomous phone conversations | **Yes** — the voice agent reasons and responds in real time on the call |
| Platform orchestrating campaigns, webhooks, leads, scheduling | **Partial** — workflow automation, not LLM-driven planning |
| Custom tool-using agents (search, CRM, calendar, etc.) | **No** |
| Multi-agent collaboration or ReAct-style loops in your code | **No** |

**For a resume**, describe it as:

> *Built an AI-powered outbound calling platform integrating ElevenLabs conversational agents with Twilio, featuring webhook-driven call lifecycle management, scheduled campaign execution, and lead capture from voice conversations.*

That is accurate and impressive. If a role specifically asks for **agentic AI** (autonomous agents with tools, memory, planning), pair this with language like:

- *"Integrates third-party conversational AI agents into a production workflow"*
- *"Webhook-orchestrated pipeline from AI conversation → structured lead"*

…rather than claiming you built a multi-agent framework from scratch.

**Strengths for portfolio**

- Real integrations (Twilio + ElevenLabs), not a mock API
- Production concerns: auth, encryption, CORS, cookies, webhooks, race conditions
- End-to-end product: dashboard, campaigns, leads, filters
- Deployed and demoable

---

## License

Private / portfolio project. All rights reserved.
