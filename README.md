# MedChart EHR

A full-stack Electronic Health Record system built with Node.js, Express, Prisma, PostgreSQL, React, and TailwindCSS.

## Features

- **Auth** — JWT login with role-based access (provider / admin)
- **Patient Registry** — Full CRUD with search and status filtering
- **Kanban Workflow** — Drag-and-drop board (Waiting → In Progress → Completed)
- **Provider Notes** — SOAP, assessment, and general note types per patient
- **Billing** — Charges with CPT codes, payment status tracking (pending / paid / denied)
- **Dashboard** — Live stats: patient counts, revenue, quick actions
- **Patient Chart** — Tabbed detail view with overview, notes, and billing

## Tech Stack

| Layer      | Stack                                          |
|------------|------------------------------------------------|
| Backend    | Node.js · Express · Prisma ORM · PostgreSQL    |
| Frontend   | React 18 · Vite · TailwindCSS · React Query v5 |
| Auth       | JWT (jsonwebtoken + bcryptjs)                  |
| Deploy     | Railway (backend) · Vercel (frontend)          |

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a free Railway / Neon / Supabase instance)

### 1. Clone & install

```bash
git clone <your-repo>
cd medchart-ehr

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env with your DATABASE_URL and JWT_SECRET

# Frontend
cp .env.example frontend/.env
# Edit VITE_API_URL if your backend runs on a different port
```

### 3. Set up the database

```bash
cd backend
npx prisma db push        # create tables
node prisma/seed.js       # seed 3 demo patients + 2 users
```

### 4. Start the servers

```bash
# Terminal 1 — backend (http://localhost:4000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

Open http://localhost:5173 and log in with:

| Role     | Email                      | Password     |
|----------|----------------------------|--------------|
| Provider | dr.smith@medchart.com      | password123  |
| Admin    | admin@medchart.com         | password123  |

---

## Deployment

### Backend → Railway

1. Push your code to GitHub
2. Create a new Railway project → "Deploy from GitHub repo"
3. Add a PostgreSQL service inside Railway
4. Set these environment variables in Railway:
   ```
   DATABASE_URL=<railway postgres url>
   JWT_SECRET=<random 64-char string>
   FRONTEND_URL=https://your-app.vercel.app
   PORT=4000
   ```
5. Railway will auto-detect `railway.json` and run `npm start`
6. After first deploy, run the seed via Railway Shell: `node prisma/seed.js`

### Frontend → Vercel

1. Push `frontend/` to GitHub (or the same repo)
2. Import into Vercel, set **Root Directory** to `frontend`
3. Add environment variable:
   ```
   VITE_API_URL=https://your-railway-app.up.railway.app/api
   ```
4. Vercel auto-detects Vite and builds with `npm run build`
5. The `vercel.json` handles SPA routing rewrites

---

## API Reference

All routes prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Path              | Auth | Description        |
|--------|-------------------|------|--------------------|
| POST   | /auth/login       | No   | Get JWT token      |
| POST   | /auth/register    | No   | Create account     |
| GET    | /auth/me          | Yes  | Current user info  |

### Patients
| Method | Path                         | Description              |
|--------|------------------------------|--------------------------|
| GET    | /patients                    | List (search, status)    |
| GET    | /patients/stats              | Dashboard counts         |
| GET    | /patients/:id                | Full chart               |
| POST   | /patients                    | Create                   |
| PUT    | /patients/:id                | Update                   |
| PATCH  | /patients/:id/status         | Update status only       |
| DELETE | /patients/:id                | Delete                   |

### Notes
| Method | Path                              | Description  |
|--------|-----------------------------------|--------------|
| GET    | /patients/:patientId/notes        | List notes   |
| POST   | /patients/:patientId/notes        | Add note     |
| PUT    | /patients/:patientId/notes/:id    | Edit note    |
| DELETE | /patients/:patientId/notes/:id    | Delete note  |

### Billing
| Method | Path                                | Description       |
|--------|-------------------------------------|-------------------|
| GET    | /billing/all                        | All charges       |
| GET    | /billing/summary                    | Revenue summary   |
| GET    | /patients/:patientId/billing        | Patient charges   |
| POST   | /patients/:patientId/billing        | Add charge        |
| PATCH  | /billing/:id/status                 | Update status     |
| DELETE | /billing/:id                        | Delete charge     |

---

## Project Structure

```
medchart-ehr/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # User, Patient, Note, Charge models
│   │   └── seed.js              # 3 demo patients + charges + notes
│   ├── src/
│   │   ├── middleware/auth.js   # JWT verification
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── patients.js
│   │   │   ├── notes.js
│   │   │   └── billing.js
│   │   └── index.js             # Express app entry
│   ├── railway.json
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/client.js        # Axios instance + interceptors
    │   ├── context/AuthContext  # JWT auth state
    │   ├── components/          # Layout, Sidebar, ProtectedRoute
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       ├── Patients.jsx
    │       ├── PatientChart.jsx  # Tabbed: overview / notes / billing
    │       ├── Kanban.jsx        # Drag-and-drop workflow board
    │       ├── Notes.jsx
    │       └── Billing.jsx
    ├── vercel.json
    └── package.json
```
