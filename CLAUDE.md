# MedChart EHR

A full-stack Electronic Health Records system.

## Architecture

- **Frontend**: React 18, Vite, TailwindCSS, React Query v5, React Router v6 — lives in `frontend/`
- **Backend**: Node.js, Express, Prisma ORM, PostgreSQL — lives in `backend/`
- **Auth**: JWT-based, stored in localStorage, role field on User (`provider` default)

## Data models (Prisma schema)

- `User` — providers/staff, has `role` field
- `Patient` — has `mrn` (unique), `status` (Waiting/etc), linked to Notes and Charges
- `Note` — clinical notes, typed (`general` default), belongs to Patient + User author
- `Charge` — billing records with `cptCode`, `amount`, `status` (pending/etc)

## Dev commands

```bash
# Backend
cd backend && npm run dev       # nodemon on src/index.js
cd backend && npm run db:studio # Prisma Studio GUI

# Frontend
cd frontend && npm run dev      # Vite dev server
```

## Conventions

- Backend routes are in `backend/src/routes/` (auth, patients, notes, billing)
- Auth middleware lives in `backend/src/middleware/auth.js`
- Frontend API calls are in `frontend/src/api/`
- Frontend pages in `frontend/src/pages/`, shared components in `frontend/src/components/`
- Auth state managed via React context in `frontend/src/context/`

## Key constraints

- This is a healthcare app — never log or expose PHI (patient data) in errors or console output
- All patient routes must go through the auth middleware
- Database is PostgreSQL via `DATABASE_URL` env var; use Prisma for all DB access, no raw SQL
