<p align="center">
  <h1 align="center">📒 LoanBook</h1>
  <p align="center"><strong>Personal Loan & Interest Management — Built for Independent Lenders</strong></p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma" alt="Prisma ORM" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Tests-77%2F77_PASS-22c55e?style=for-the-badge" alt="Test Suite" />
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel" alt="Vercel" />
</p>

---

## Overview

**LoanBook** is a personal-use loan and interest management platform built for independent lenders. Each authenticated user owns their own isolated data — borrowers, loans, dues, payments, and settings — with no cross-user visibility of any kind.

The platform handles the full loan lifecycle: issuance, monthly/daily interest accrual, partial payments, principal repayments, top-ups, overdue capitalization, and WhatsApp-integrated borrower communication — all from a clean, mobile-friendly web UI.

---

## Architecture

```mermaid
graph TD
    Client[Browser / Mobile Web] -->|HTTP Cookie Session| MW[Next.js Middleware & Security Headers]
    MW --> AR[App Router — Server Actions & Page Components]
    AR --> Auth[Auth & Rate-Limit Layer]
    AR --> Engine[Financial Engine & Due Generator]

    Auth -->|JWT validation| DB[(Neon PostgreSQL)]
    Engine -->|Prisma ORM| DB

    Cron[Vercel Cron Job] -->|Bearer CRON_SECRET| API[/api/cron/generate-dues]
    API --> Engine
```

---

## Features

### 🔐 Security & Authentication
| Feature | Detail |
|---|---|
| Email + password auth | Case-insensitive normalized email, server-side validation, enumeration-safe responses |
| Cryptographic password reset | 32-byte random tokens stored as SHA-256 hashes with 1-hour expiry |
| Session revocation | `tokenVersion` counter on `User`; password changes instantly invalidate all active sessions |
| Rate limiting | Sliding-window limiter on login, register, password reset, and onboarding endpoints |
| Legacy onboarding | `/account/setup` migration workflow links a verified email to an existing mobile-based account without altering historical data |

### 💰 Financial Engine
| Feature | Detail |
|---|---|
| Simple interest | Fixed monthly rate with exact daily pro-rata logic |
| Compound interest | Monthly compounding, missed-payment capitalization, capitalized interest tracking |
| Idempotent due generation | `(loanId, dueDate)` unique index eliminates duplicate interest entries |
| Smart payment allocation | Clears oldest overdue dues first; handles overpayments without data loss |
| Principal repayments | Reduces outstanding principal and recalculates future pending dues |
| Loan top-ups | Increases principal and regenerates forward dues while preserving paid history |

### 📊 Portfolio & Reporting
| Feature | Detail |
|---|---|
| Collections dashboard | Daily collections, upcoming dues, overdue interest, active principal, cash received |
| Borrower ledgers | Per-borrower account statements, printable and shareable via WhatsApp |
| WhatsApp messaging | Customizable message templates generate `wa.me` deep-links on demand |
| CSV export | Full portfolio export with anti-formula-injection sanitization |
| Audit log | `AuditLog` table tracks all account actions for financial integrity |

---

## Technology Stack

| Layer | Technology | Version | Role |
|---|---|---|---|
| Framework | Next.js | `16.2.x` | App Router, Server Actions, Dynamic SSR |
| Language | TypeScript | `5.x` | End-to-end strict type safety |
| Styling | Tailwind CSS | `3.4.x` | Responsive utility-first UI |
| Database | PostgreSQL | `15+` | Relational storage via Neon Serverless |
| ORM | Prisma | `5.22.x` | Schema migrations, type-safe queries |
| Auth | Custom JWT | `jose` + `bcryptjs` | HTTP-only cookie sessions & password hashing |
| Testing | Node Test Runner | Native Node.js | 77 unit, integration & financial engine tests |
| Deployment | Vercel | — | App hosting, Edge Middleware, Cron Jobs |

---

## Repository Structure

```text
GuruFinance/
├── .github/
│   └── workflows/
│       └── prisma-db-check.yml     # Manual GitHub Actions workflow for DB health checks
├── prisma/
│   ├── migrations/                 # Forward-only SQL migration history
│   └── schema.prisma               # Database schema & entity relationships
├── scripts/
│   ├── export-business-data.ts     # One-off data export utility
│   └── cleanup-business-data.ts   # One-off data cleanup utility
├── src/
│   ├── app/
│   │   ├── actions/                # Server Actions — auth, loans, payments, borrowers, settings
│   │   ├── account/setup/          # Legacy email-onboarding flow
│   │   ├── api/
│   │   │   ├── cron/               # Scheduled due generation endpoint
│   │   │   └── search/             # Server-side borrower search
│   │   ├── borrowers/              # Borrower management & statements
│   │   ├── collections/            # Daily, upcoming, and overdue collections view
│   │   ├── dashboard/              # Executive analytics dashboard
│   │   ├── loans/                  # Loan issuance and detail views
│   │   ├── login/                  # Authentication UI
│   │   ├── register/               # Lender registration UI
│   │   ├── reports/                # Portfolio financial reports
│   │   └── settings/               # Per-user settings & WhatsApp template editor
│   ├── components/                 # Reusable UI component library
│   ├── features/                   # Domain engines — due-engine, interest-engine, whatsapp
│   ├── lib/                        # Server utilities — auth, email, prisma client, rate-limit
│   ├── types/                      # Shared TypeScript type definitions
│   └── utils/                      # Helpers — email normalization, formatting, date utils
├── tests/
│   └── financial.test.ts           # Full test suite (77 tests)
├── .env.example                    # Environment variable template
├── next.config.js                  # Next.js config & HTTP security headers
├── vercel.json                     # Vercel cron job configuration
├── package.json                    # Dependencies and NPM scripts
└── README.md
```

---

## Database Schema

```text
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────────┐
│      User       │ 1────* │    Borrower     │ 1────* │        Loan         │
├─────────────────┤        ├─────────────────┤        ├─────────────────────┤
│ id (PK)         │        │ id (PK)         │        │ id (PK)             │
│ name            │        │ userId (FK)     │        │ borrowerId (FK)     │
│ email (UQ,Null) │        │ fullName        │        │ principalAmount     │
│ mobile (UQ)     │        │ mobile          │        │ interestRate        │
│ passwordHash    │        └─────────────────┘        │ interestType        │
│ tokenVersion    │                                    └──────────┬──────────┘
└────────┬────────┘                                               │ 1
         │ 1                                                      │
         │ *                                                      │ *
┌────────▼────────┐                                   ┌──────────▼──────────┐
│    Settings     │                                   │     InterestDue     │
├─────────────────┤                                   ├─────────────────────┤
│ id (PK)         │                                   │ id (PK)             │
│ userId (FK)     │                                   │ loanId (FK)         │
│ key             │                                   │ dueDate             │
│ value           │                                   │ dueAmount           │
└─────────────────┘                                   │ status              │
                                                      └─────────────────────┘
```

**Settings** uses a key-value store per user. WhatsApp message templates are stored under keys such as `whatsapp_template_due`, `whatsapp_template_receipt`, etc.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values before running locally:

```env
# ── Database ───────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host.neon.tech/neondb?sslmode=require"

# ── Auth & Security ─────────────────────────────────────────────
JWT_SECRET="replace-with-a-secure-32-character-random-secret"
CRON_SECRET="replace-with-a-secure-cron-authorization-secret"

# ── Application ─────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME="LoanBook"
NEXT_PUBLIC_APP_URL="https://your-deployment.vercel.app"
NODE_ENV="development"

# ── Optional: Email Provider ────────────────────────────────────
# EMAIL_PROVIDER_URL="https://api.resend.com/emails"
# EMAIL_PROVIDER_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
```

> [!CAUTION]
> Never commit `.env` or any file containing real credentials to version control.

---

## Quick Start

### Prerequisites
- **Node.js** `v20.x` or `v22.x`
- **npm** `v10+`
- **PostgreSQL** `v15+` — local instance or [Neon](https://neon.tech) serverless database

### 1. Clone & install

```bash
git clone https://github.com/Gurjotsinghh13/GuruFinance.git
cd GuruFinance
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, and CRON_SECRET
```

### 3. Set up the database

```bash
# Apply all pending migrations
npx prisma migrate deploy

# (Optional) Seed demo data
npm run db:seed
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (Webpack mode) |
| `npm run build` | Generate Prisma client + compile production bundle |
| `npm run start` | Run the compiled production server |
| `npm test` | Execute the full test suite (77 tests) |
| `npm run lint` | Run ESLint across the codebase |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:push` | Push schema changes to the database (dev only) |
| `npm run db:migrate` | Create and apply a new migration (dev) |
| `npm run db:migrate:prod` | Deploy pending migrations (production) |
| `npm run db:seed` | Seed the database with demo data |
| `npm run db:studio` | Open Prisma Studio in the browser |
| `npm run db:reset` | Reset and re-apply all migrations (dev only) |

---

## Test Suite

The test suite uses the native Node.js test runner and covers financial calculations, payment allocation, security controls, and authentication flows.

```bash
npm test
```

**All 77 tests pass:**

| Category | Status |
|---|---|
| Simple Interest Calculation | ✅ PASS |
| Compound Interest Progression | ✅ PASS |
| Payment Allocation (Oldest-First) | ✅ PASS |
| Principal Repayment Recalculation | ✅ PASS |
| Loan Top-Up Recalculation | ✅ PASS |
| Overdue Capitalization Protection | ✅ PASS |
| WhatsApp Template Persistence | ✅ PASS |
| Email Authentication & Normalization | ✅ PASS |
| Legacy Account Onboarding (`/account/setup`) | ✅ PASS |
| Security Headers & Rate Limiting | ✅ PASS |

Additional verification commands:

```bash
npx tsc --noEmit        # Static type-check (zero errors expected)
npx prisma validate     # Validate Prisma schema
npm run build           # Confirm production build succeeds
```

---

## Deployment

### Vercel (Recommended)

1. Connect the GitHub repository to **[Vercel](https://vercel.com)**.
2. Set the following environment variables in the Vercel project dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_APP_URL`
3. Deploy — Vercel will automatically run `npm run build` on each push to `main`.

Cron job configuration is managed via [`vercel.json`](./vercel.json).

### GitHub Actions

The workflow at `.github/workflows/prisma-db-check.yml` allows on-demand database health checks without a deployment:

> **GitHub** → **Actions** → **Prisma Database Check** → **Run workflow**

---

## License

This project is source-available for personal and educational use. It is designed as a financial management tool — validate calculation outputs and configure database backups before using in any production lending environment.
