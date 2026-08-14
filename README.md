# LoanBook SaaS

<p align="center">
  <strong>Production-Grade Multi-User Loan & Interest Management SaaS</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma" alt="Prisma ORM" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Tests-77%2F77_PASS-brightgreen?style=for-the-badge" alt="Tests" />
</p>

---

## Executive Summary

**LoanBook SaaS** is a multi-user, production-grade lending management and interest calculation platform designed for independent lenders and financial organizations. It provides real-time portfolio tracking, simple and compound interest engines, automated monthly/daily due generation, partial payment allocations, principal repayments, loan top-ups, account statements, audit logs, and WhatsApp customer messaging.

Built with Next.js 16 (App Router), TypeScript, Prisma ORM, and PostgreSQL (hosted on Neon), LoanBook enforces strict user isolation, cryptographically secure authentication, rate-limiting, and financial audit integrity.

---

## High-Level Architecture

```mermaid
graph TD
    Client[Client Browser / Mobile Web] -->|HTTP Cookie / Session| Middleware[Next.js Middleware & Security Headers]
    Middleware --> AppRouter[Next.js 16 App Router Server Actions]
    AppRouter --> Auth[Authentication & Rate Limiting Engine]
    AppRouter --> Engine[Financial Engine / Due Generator]

    Auth -->|JWT Session Validation| DB[(Neon PostgreSQL Database)]
    Engine -->|Prisma ORM Queries| DB

    CronJob[Vercel Cron / API Trigger] -->|Bearer CRON_SECRET| DuesApi[/api/cron/generate-dues]
    DuesApi --> Engine
```

---

## Feature Overview

### 🔐 Security & Identity Management
- **Email + Password Auth**: Case-insensitive normalized email identity with server-side format validation and generic response protection against account enumeration.
- **Legacy Account Onboarding (`/account/setup`)**: Migration workflow allowing pre-existing lenders (without an email) to link a verified email address using mobile credentials without altering `user.id` or historical data.
- **Cryptographic Password Recovery**: 32-byte cryptographically secure random reset tokens, stored as SHA-256 hashes with 1-hour expiration limits.
- **Session Revocation**: `tokenVersion` counter on `User` model; password modifications automatically invalidate all active JWT sessions.
- **Rate Limiting**: Sliding-window rate-limiter for login, registration, password recovery, and onboarding endpoints.

### 💰 Financial Engine Capabilities
- **Simple Interest Engine**: Supports fixed monthly rates and exact daily pro-rata interest logic.
- **Compound Interest Engine**: Supports monthly compounding rules, missed-payment compounding triggers, and capitalized interest tracking.
- **Idempotent Due Generation**: Enforces `(loanId, dueDate)` database unique index to eliminate duplicate interest dues.
- **Smart Payment Allocation**: Prioritizes overdue collectible dues (oldest-first) and handles overpayments seamlessly.
- **Principal Lifecycle Operations**: Principal repayments and loan top-ups automatically recalculate future pending dues while preserving historical paid records.

### 📊 Portfolio Management & Reporting
- **Collections Dashboard**: Track daily collections, upcoming dues, overdue interest, active principal, and cash received.
- **Borrower Ledgers & Statements**: Downloadable, printable account statements with WhatsApp receipt links.
- **Data Export**: Sanitized CSV portfolio export equipped with anti-CSV formula injection (`'`) protection.
- **Audit Logging**: Comprehensive activity tracking recorded via `AuditLog` for auditing account actions.

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js | `16.2.9` | App Router, Server Actions, Dynamic SSR |
| **Language** | TypeScript | `5.x` | Strict type-safety across models and actions |
| **Styling** | Tailwind CSS | `3.4.19` | Modern responsive UI & CSS design system |
| **Database** | PostgreSQL | `v15+` | Relational storage hosted on Neon Serverless |
| **ORM** | Prisma | `5.22.0` | Schema migrations and type-safe query building |
| **Auth** | Custom JWT | `jose` / `bcryptjs` | HTTP-only cookie sessions with password hashing |
| **Testing** | Node Test Runner | Node.js native | 77 unit, integration, and financial engine tests |
| **Deployment** | Vercel | Production | App Hosting, Edge Middleware, and Cron Jobs |

---

## Repository Structure

```text
GuruFinance/
├── .github/
│   └── workflows/
│       └── prisma-db-check.yml       # Manual GitHub Actions workflow for DB status checks
├── prisma/
│   ├── migrations/                  # Forward-only SQL migrations
│   └── schema.prisma                # Database schema & entity definitions
├── src/
│   ├── app/
│   │   ├── actions/                 # Next.js Server Actions (Auth, Loans, Payments, Borrowers)
│   │   ├── account/setup/           # Legacy existing user email onboarding page
│   │   ├── api/                     # REST API routes (Cron dues generator, Search)
│   │   ├── borrowers/               # Borrower management pages & statements
│   │   ├── collections/             # Daily, upcoming, and overdue collections workspace
│   │   ├── dashboard/               # Executive dashboard analytics
│   │   ├── loans/                   # Loan issuance and detail views
│   │   ├── login/                   # Email authentication login view
│   │   ├── register/                # Lender onboarding view
│   │   ├── reports/                 # Portfolio financial reports
│   │   └── settings/                # User settings & template customization
│   ├── components/                  # Reusable UI component library
│   ├── features/                    # Core business domain engines (due-engine, interest-engine, whatsapp)
│   ├── lib/                         # Server utilities (auth, email, prisma, rate-limit)
│   ├── types/                       # Application TypeScript definitions
│   └── utils/                       # Shared helper functions (email normalization, formatting)
├── tests/
│   └── financial.test.ts            # Complete unit & financial engine test suite (77 tests)
├── next.config.js                   # Next.js configuration & HTTP security headers
├── package.json                     # NPM dependencies and script registry
└── README.md                        # Documentation
```

---

## Database Schema (ERD Overview)

```text
+-------------------+        +-------------------+        +-------------------+
|       User        | 1    * |     Borrower      | 1    * |       Loan        |
+-------------------+------->+-------------------+------->+-------------------+
| id (PK)           |        | id (PK)           |        | id (PK)           |
| name              |        | userId (FK)       |        | borrowerId (FK)   |
| email (UQ, Null)  |        | fullName          |        | principalAmount   |
| mobile (UQ)       |        | mobile            |        | interestRate      |
| passwordHash      |        +-------------------+        | interestType      |
| tokenVersion      |                                     +---------+---------+
+---------+---------+                                               |
          | 1                                                       | 1
          |                                                         |
          | *                                                       | *
+---------v---------+                                     +---------v---------+
|     Settings      |                                     |    InterestDue    |
+-------------------+                                     +-------------------+
| id (PK)           |                                     | id (PK)           |
| userId (FK)       |                                     | loanId (FK)       |
| key               |                                     | dueDate           |
| value             |                                     | dueAmount         |
+-------------------+                                     | status            |
                                                          +-------------------+
```

---

## Environment Variables Reference

Create a `.env` file in the root directory prior to running the application locally:

```env
# ── Database Connection ───────────────────────────────────────
DATABASE_URL="postgresql://neondb_owner:PASSWORD@HOST.neon.tech/neondb?sslmode=require"

# ── Authentication & Security Secrets ──────────────────────────
JWT_SECRET="replace-with-a-secure-random-32-character-secret"
CRON_SECRET="replace-with-a-secure-cron-authorization-secret"

# ── Application Configuration ─────────────────────────────────
NEXT_PUBLIC_APP_NAME="LoanBook"
NEXT_PUBLIC_APP_URL="https://guru-finance.vercel.app/"
NODE_ENV="development"

# ── Optional External Integration Providers ────────────────────
# EMAIL_PROVIDER_URL="https://api.resend.com/emails"
# EMAIL_PROVIDER_API_KEY="re_123456789"
```

> [!IMPORTANT]
> Never commit `.env` files or hardcode production credentials to version control.

---

## Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **Package Manager**: `npm` (v10+)
- **Database**: PostgreSQL 15+ (Local or Neon PostgreSQL)

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/Gurjotsinghh13/GuruFinance.git
cd GuruFinance

# Install dependencies
npm install
```

### 3. Database Initialization

```bash
# Generate Prisma Client
npm run db:generate

# Apply database migrations
npx prisma migrate deploy
```

### 4. Run Development Server

```bash
npm run dev
```

Navigate to `http://localhost:3000` in your web browser.

---

## Production Verification & Test Suite

The repository contains a native test suite covering all financial calculations, payment allocation logic, security controls, and authentication flows.

```bash
# Run all unit, integration, and financial QA tests
npm test
```

### Verification Results (77/77 PASS):
- **Simple Interest Calculation**: PASS
- **Compound Interest Progression**: PASS
- **Payment Allocation (Oldest-First Priority)**: PASS
- **Principal Repayment Recalculation**: PASS
- **Loan Top-Up Recalculation**: PASS
- **Overdue Capitalization Protection**: PASS
- **Email Authentication & Normalization**: PASS
- **Legacy Account Email Onboarding (`/account/setup`)**: PASS
- **Security Headers & Rate Limiting**: PASS

```bash
# Perform static type checking
npx tsc --noEmit

# Validate Prisma schema
npx prisma validate

# Test production build
npm run build
```

---

## Operational Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Compile Next.js production bundle |
| `npm test` | Execute test suite |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate:prod` | Deploy pending database migrations |
| `npm run db:studio` | Open Prisma Studio GUI |

---

## Deployment & CI/CD Workflows

### Vercel Deployment
1. Connect the GitHub repository to **Vercel**.
2. Configure environment variables (`DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`).
3. Deploy with default build command (`npm run build`).

### GitHub Actions Manual DB Status Check
The workflow `.github/workflows/prisma-db-check.yml` allows manual status checks against the production database:
- Trigger via **GitHub Actions** tab -> `Prisma Database Check` -> `Run workflow`.

---

## License & Notice

This software is designed as a loan and interest management platform. Verify calculation outputs and configure automated database backups before deployment in financial environments.
