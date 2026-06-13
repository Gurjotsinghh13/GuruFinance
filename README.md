# GuruFinance

Smart Loan & Interest Management

GuruFinance is a mobile-first private lending management app. It tracks borrowers, loans, interest dues, collections, partial payments, principal repayments, loan top-ups, overdue accounts, reports, and audit history.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router + TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT cookies + bcryptjs |
| Deployment | Vercel |
| Scheduling | Vercel Cron Jobs |

## Core Features

- Borrower management with create, edit, archive, and restore workflows.
- Multiple loans per borrower.
- Monthly and daily interest dues.
- Simple and compound interest fields.
- Interest payment recording with automatic allocation.
- Partial and multiple partial payment support.
- Principal repayment with future due recalculation.
- Loan top-up with future due recalculation.
- Loan closure with future due cleanup.
- Overdue detection through scheduled cron.
- Dashboard for active principal, received cash, pending interest, overdue interest, and collections.
- Collections page for today, upcoming, and overdue dues.
- Borrower ledger and account statement.
- Reports for monthly due/collection summaries.
- Audit log for important account and financial actions.
- WhatsApp deep-link reminders.

## Important Financial Safeguards

- Money values use PostgreSQL `Decimal` columns.
- Payment allocations are stored separately from payments.
- Principal movements are stored in immutable `LoanTransaction` rows.
- Future pending dues are regenerated after principal changes.
- Future partial dues are recalculated while preserving paid amounts and allocation history.
- Duplicate dues are prevented at database level with a unique constraint on `(loanId, dueDate)`.
- Dashboard "Received" uses actual `Payment.paymentDate`, not due date.

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="use-a-random-secret-at-least-32-characters"
CRON_SECRET="use-another-random-secret"
```

Do not commit `.env`.

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Apply Migrations

```bash
npx prisma migrate deploy
```

For local development only, if you intentionally want to create new migrations:

```bash
npm run db:migrate
```

### 5. Optional Seed Data

```bash
npm run db:seed
```

Warning: the seed file contains demo credentials. Do not seed demo credentials into a real production database.

### 6. Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Build production app |
| `npm run start` | Start production server |
| `npm test` | Run financial workflow tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Create/apply local Prisma migration |
| `npm run db:migrate:prod` | Apply migrations in production |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Deployment To Vercel

### 1. Push To GitHub

```bash
git init
git add .
git commit -m "Initial GuruFinance app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gurufinance.git
git push -u origin main
```

### 2. Import Project In Vercel

1. Open Vercel.
2. Create a new project.
3. Import the GitHub repository.
4. Add environment variables:

| Variable | Required | Notes |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | At least 32 characters |
| `CRON_SECRET` | Yes | Used by `/api/cron/generate-dues` |

### 3. Deploy

Use the default Vercel build command:

```bash
npm run build
```

### 4. Apply Production Migrations

Run:

```bash
npx prisma migrate deploy
```

## Cron Job

Configured in `vercel.json`:

```text
30 18 * * *
```

This runs at 18:30 UTC, which is 00:00 IST.

Cron endpoint:

```text
/api/cron/generate-dues
```

It:

- Generates rolling future dues for active loans.
- Marks past pending/partial dues as overdue.
- Updates `daysOverdue`.

The endpoint requires:

```http
Authorization: Bearer <CRON_SECRET>
```

## Database Notes

Important tables:

- `users`
- `borrowers`
- `loans`
- `interest_dues`
- `payments`
- `payment_allocations`
- `loan_transactions`
- `audit_logs`

Important database protection:

```prisma
@@unique([loanId, dueDate])
```

on `InterestDue`.

This prevents duplicate due rows for the same loan and date.

## Backup Procedure

Daily backup:

```bash
mkdir -p backups/daily
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="backups/daily/gurufinance-daily-$(date +%Y-%m-%d).dump"
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force backups\daily
$today = Get-Date -Format "yyyy-MM-dd"
pg_dump $env:DATABASE_URL --format=custom --no-owner --no-acl --file="backups\daily\gurufinance-daily-$today.dump"
```

Keep:

- 30 daily backups.
- 12 weekly backups.
- At least one copy outside the computer/server.

## Restore Procedure

Restore a backup:

```bash
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" backups/daily/gurufinance-daily-YYYY-MM-DD.dump
npx prisma migrate deploy
```

Windows PowerShell:

```powershell
pg_restore --clean --if-exists --no-owner --no-acl --dbname=$env:DATABASE_URL backups\daily\gurufinance-daily-YYYY-MM-DD.dump
npx.cmd prisma migrate deploy
```

After restore, verify:

- Login works.
- Borrowers load.
- Loans load.
- Payments and allocations are visible.
- Dashboard totals look correct.
- Collections and reports load.

## Production Checklist

Before real usage:

- Set strong production `DATABASE_URL`, `JWT_SECRET`, and `CRON_SECRET`.
- Confirm `.env` is not committed.
- Apply migrations with `npx prisma migrate deploy`.
- Do not seed demo credentials into production.
- Create a real admin user.
- Run `npm test`.
- Run `npm run build`.
- Verify cron endpoint works with `CRON_SECRET`.
- Configure database backups.
- Perform a restore test on a staging database.
- Manually test borrower, loan, payment, principal repayment, top-up, closure, dashboard, collections, and reports.

## Security Notes

- Passwords are hashed with bcrypt.
- Sessions use signed JWT cookies.
- Cookies are `httpOnly`; production cookies are `secure`.
- Routes are protected by middleware.
- Server actions validate ownership before modifying user records.
- Cron endpoint is protected with bearer token.
- Audit logs record important activity.

Remaining production hardening recommended:

- Add login rate limiting.
- Add session invalidation on password change.
- Add real password reset delivery through SMS/email.
- Add formal payment reversal workflow.
- Add error monitoring such as Sentry.

## Testing

Run:

```bash
npm test
```

Current test coverage includes:

- Simple interest.
- Partial payments.
- Multiple partial payments.
- Principal repayment.
- Loan top-up.
- Loan closure.
- Overdue detection.
- Dashboard received cash calculation.
- Payment allocation.

## Troubleshooting

### Build Fails On Google Fonts

The app uses `next/font/google`. The build environment needs network access to Google Fonts.

### Database Connection Error

Check:

- `DATABASE_URL` is set.
- SSL mode is included if required by the provider.
- The database is awake and reachable.

### Prisma Client Errors

Run:

```bash
npm run db:generate
```

### Vercel Build Error For API Routes

`/api/search` is configured as dynamic Node runtime because it uses cookies and Prisma:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

### Cron Not Running

Check:

- `vercel.json` exists.
- `CRON_SECRET` is set.
- Vercel cron logs.

## Private Use Notice

GuruFinance is designed as a private loan and interest record-keeping tool. Verify calculations and backups before using it as the only source of financial records.
