# GuruFinance — Smart Loan & Interest Management

A production-ready, mobile-first web application to replace the paper diary for private lenders. Tracks borrowers, loans, interest dues, payments, and generates reports automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router + TypeScript |
| Styling | Tailwind CSS (no UI library dependency) |
| Database | PostgreSQL (Neon recommended) |
| ORM | Prisma |
| Auth | JWT cookies (bcryptjs) |
| Deployment | Vercel |
| Scheduling | Vercel Cron Jobs |

---

## Features

- **Today's Collection** — Default home screen showing all dues for today with one-tap payment
- **Borrower Management** — Full CRUD, archive/restore, multiple loans per borrower
- **Loan Management** — Simple & compound interest, monthly & daily frequency, collateral tracking
- **Auto Due Generation** — Cron job generates 3 months of dues rolling, every midnight
- **Payment Engine** — Allocates payments to oldest dues first, supports partial payments
- **Principal Repayment** — Reduces principal, regenerates future dues automatically
- **Loan Top-Up** — Adds to principal with full audit trail
- **Overdue Tracker** — Auto-marks overdue, shows days overdue
- **WhatsApp Integration** — One-tap deep links with customizable templates
- **Reports** — 6-month collection charts, outstanding report
- **Audit Log** — Every action timestamped and recorded
- **Settings** — Editable WhatsApp message templates

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon free tier recommended)

### Step 1: Clone and install

```bash
git clone <your-repo>
cd gurufinance
npm install
```

### Step 2: Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://..."   # Your Neon connection string
JWT_SECRET="your-secret-here"     # At least 32 random characters
CRON_SECRET="your-cron-secret"    # Any random string
```

### Step 3: Set up database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates all tables)
npm run db:push

# Seed with sample data
npm run db:seed
```

### Step 4: Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default login:**
- Mobile: `9999999999`
- Password: `Admin@123`

---

## Deployment to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/gurufinance.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Set environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon PostgreSQL URL |
| `JWT_SECRET` | Long random string (32+ chars) |
| `CRON_SECRET` | Random string |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |

4. Click **Deploy**

### Step 3: Run migrations on production

After first deploy:

```bash
# Using Vercel CLI
vercel env pull
npx prisma migrate deploy

# Or via Vercel dashboard → Functions → Run command
```

### Step 4: Seed production (optional)

```bash
DATABASE_URL="your-prod-url" npm run db:seed
```

---

## Database Setup (Neon)

1. Go to [neon.tech](https://neon.tech) → Sign up free
2. Create project → Select "India" region
3. Copy the connection string from Dashboard
4. Paste in `DATABASE_URL`

---

## Project Structure

```
gurufinance/
├── prisma/
│   ├── schema.prisma          # Complete database schema
│   └── seed.ts                # Sample data seeder
├── src/
│   ├── app/
│   │   ├── actions/           # Server Actions (auth, borrowers, loans, payments)
│   │   ├── api/cron/          # Cron job endpoint
│   │   ├── dashboard/         # Today's collection (home screen)
│   │   ├── borrowers/         # Borrower list, detail, new
│   │   ├── loans/             # Loan list, detail, new
│   │   ├── collections/       # Collections by date range
│   │   ├── reports/           # Monthly reports
│   │   ├── settings/          # WhatsApp templates, password
│   │   └── login/             # Auth pages
│   ├── components/
│   │   ├── dashboard/         # Stats, morning briefing, collection list
│   │   ├── borrowers/         # Borrower header, list
│   │   ├── loans/             # Loan card, loan detail
│   │   ├── payments/          # Payment modal
│   │   ├── collections/       # Collections list
│   │   ├── reports/           # Report charts
│   │   ├── settings/          # Settings UI
│   │   └── shared/            # Sidebar, mobile nav, topbar
│   ├── features/
│   │   ├── interest-engine/   # All interest calculations (pure functions)
│   │   ├── due-engine/        # Due generation and overdue logic
│   │   ├── payment-engine/    # Payment processing
│   │   └── whatsapp/          # Template management and link building
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── auth.ts            # JWT session management
│   ├── types/
│   │   └── index.ts           # All TypeScript types
│   └── utils/
│       └── index.ts           # Formatters, generators, helpers
├── .env.example
├── vercel.json                 # Cron schedule
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## How Dues Are Generated

1. **On Loan Creation** — Generates 3 months of future dues immediately
2. **Nightly Cron** (12:00 AM IST) — Generates dues for all active loans up to 3 months ahead
3. **After Principal Change** — Deletes future PENDING dues and regenerates with new principal

The cron runs at `18:30 UTC` which is `00:00 IST`.

---

## Interest Calculation Rules

### Monthly Simple Interest
```
Monthly Interest = Principal × Rate / 100

Example: ₹1,00,000 × 3% = ₹3,000/month
```

### Daily Interest (derived from monthly rate)
```
Annual Rate = Monthly Rate × 12
Daily Rate  = Annual Rate / 365
Daily Interest = Principal × Daily Rate

Example: ₹1,00,000 × (3% × 12 / 365) = ~₹98.63/day
```

### Partial Month (prorated)
```
First period days × Daily Rate × Principal

Used when: loan start date ≠ due day
```

### Payment Allocation Order
1. OVERDUE dues (oldest first)
2. PARTIAL dues (oldest first)
3. PENDING dues (oldest first)

Unallocated amount after covering all dues = available for principal repayment (manual action).

---

## WhatsApp Integration

No API key needed. Uses `wa.me` deep links which open WhatsApp with pre-filled message.

Templates use `{{variableName}}` syntax and are fully editable from Settings.

Available variables per template type shown in Settings UI.

---

## Cron Job

The nightly cron at `/api/cron/generate-dues`:
- Generates dues for all active loans (rolling 3-month window)
- Marks past-due PENDING/PARTIAL records as OVERDUE
- Updates `daysOverdue` count for all overdue records
- Secured with `CRON_SECRET` bearer token

Vercel Free plan: 2 cron jobs included.

---

## Adding Your First Real User

After deploying, to create your actual admin account:

```bash
# Connect to your database and run:
INSERT INTO users (id, name, mobile, "passwordHash", role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Your Name',
  '9876543210',
  '$2a$12$...',   -- bcrypt hash of your password
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

Or modify the seed file with your actual details before seeding.

---

## Security Notes

- Passwords hashed with bcrypt (cost factor 12)
- Sessions use signed JWT stored in httpOnly cookies
- All routes protected by middleware
- All data scoped to authenticated user (`userId` on every query)
- Cron endpoint protected by bearer token
- No sensitive data in URL params or localStorage

---

## Future Enhancements

These are designed for but not yet built:

- PDF statement generation (`@react-pdf/renderer`)
- SMS integration (Twilio / MSG91)
- Borrower photo upload (Cloudinary / S3)
- Export to CSV / Excel
- Multi-user support (Manager + Viewer roles ready in schema)
- Push notifications (Web Push API)

---

## Common Issues

**`prisma generate` fails**
```bash
npm install
npx prisma generate
```

**Database connection error**
- Check `DATABASE_URL` format
- Ensure `?sslmode=require` is appended for Neon

**"Module not found" errors**
- Check `@/*` path alias in `tsconfig.json`
- Run `npm run db:generate` to regenerate Prisma types

**Cron not running on Vercel**
- Verify `vercel.json` is in root
- Check CRON_SECRET matches environment variable
- Vercel Free plan crons have a 60-second timeout

---

*Built as a personal loan management tool. For private use only.*
