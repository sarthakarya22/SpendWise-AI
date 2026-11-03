# SpendWise AI

A responsive personal finance prototype built from `SpendWise_AI_PRD 2.pdf`. React + Vite, Recharts, Supabase Auth/Postgres, and a server-side NVIDIA NIM assistant. Currency: INR.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

On PowerShell systems that block npm.ps1, use `npm.cmd` instead of `npm`. Open the URL Vite prints. Click **Explore with demo data** for a working offline demonstration. Demo records are labelled, stored only in this browser, and separate from authenticated accounts. Demo does not call NVIDIA.

## Connect Supabase

1. Create a Supabase project. Run `supabase/migrations/001_initial.sql` then `002_ai_limits.sql` in its SQL editor (or apply with the Supabase CLI).
2. Copy `.env.example` to `.env.local`. Fill in your Supabase project URL and public anon key. Never put a service-role key in the frontend.
3. In Supabase Authentication settings, enable email/password and configure the Site URL and allowed redirect URLs for your local and deployed origins. Password recovery returns to the app and opens the new-password form. Configure SMTP before production use.
4. Restart Vite, create an account, confirm your email if required, and sign in. Real accounts start empty. Row Level Security isolates every user's records.

## NVIDIA API key

The app uses NVIDIA's hosted chat-completions API: https://docs.api.nvidia.com/nim/reference/llm-apis . Your NVIDIA API key stays in the Supabase Edge Function environment. Model access and free-credit availability depend on your NVIDIA account; the app handles unavailable models and exhausted quotas with explicit offline fallbacks.

With the Supabase CLI installed and authenticated:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set NVIDIA_API_KEY=YOUR_KEY
supabase secrets set NVIDIA_MODEL=nvidia/nemotron-3.5-bolt-e4b
supabase secrets set APP_ORIGIN=http://localhost:5173
supabase functions deploy ai
```

Set secrets using the Supabase dashboard instead if you prefer not to enter them in your terminal. Choose a model available to your account by changing `NVIDIA_MODEL`. For deployment, set `APP_ORIGIN` to the actual frontend origin.

The bounded assistant has two operations: category classification with validated confidence and manual override, and monthly analysis that reads the signed-in user's records. For insights, the model ranks server-calculated facts; all displayed numbers come from deterministic calculations. No arbitrary tools, transfers, bank access, or autonomous writes to transactions are exposed. A database counter limits requests to 20 per account per hour. Network calls time out after 25 seconds. Unavailable AI produces a clearly labelled rule-based or calculated fallback.

## Features

- Email/password signup, login, logout, and recovery with Supabase.
- Persistent transaction create/edit/delete, monthly filtering, search, type filter, and sorting.
- Exact integer paise calculations on the client and fixed-precision Postgres amounts.
- Dashboard, daily spending, category distribution, six-month income/expenses and savings charts.
- Monthly category budgets with remaining amount, percentage, and over-limit warnings.
- CSV column mapping, strict validation, duplicate detection, preview and explicit confirmation. Any invalid or duplicate row blocks the entire import. CSV exports respect current month, search and type filters, and escape spreadsheet formulas.
- Categorization and grounded monthly insights through NVIDIA, with offline fallbacks.
- Accessible labels, keyboard focus, responsive navigation, empty/loading/error states.

CSV columns: `name,amount,type,category,date,description`. Amount is positive with at most two decimals, date is YYYY-MM-DD, type is Income or Expense. Categories: Food, Shopping, Travel, Entertainment, Bills, Healthcare, Education, Rent, Salary, Investments, Others. Description is optional. Maximum CSV size: 2 MB.

## Verify and build

```sh
npm test
npm run build
npm run preview
```

`dist/` is the frontend deployment artifact. It can be deployed to Vercel or another static host. Configure the two public VITE Supabase variables at build time, set Supabase redirect URLs and the Edge Function APP_ORIGIN for that host, and keep NVIDIA secrets in Supabase.

For the browser smoke check, keep the development server running on port 5173 and run `node scripts/smoke.mjs`. It uses the installed Windows Chrome by default; override `CHROME_PATH` for another installation. It checks demo transaction CRUD and persistence, budget warnings, CSV validation/confirmation, offline insights, mobile overflow, and runtime errors, and writes local screenshots. It uses a fresh, isolated browser context and does not modify your normal browser data.

Manual integration checks after connecting: create two accounts and confirm data isolation; exercise signup confirmation and recovery; add/edit/delete income and expenses; cross a budget limit; test valid, malformed and duplicate CSVs; invoke NVIDIA then disable its key and verify fallback; compare insight figures to the selected month. Hosted services and live API calls require your credentials and are not validated by local unit tests.

Prototype limits: no bank synchronization, payments, receipt OCR, multi-currency, or investment advice. The NVIDIA agent can highlight month-over-month changes and unusually large expenses (over three times the monthly median, with at least four expenses); these are observations rather than fraud detection. AI records are stored in `ai_insights`; the UI generates a fresh summary rather than browsing history. Client data queries are paginated; large ledgers require server-side aggregation before production. The assistant supports up to 10,000 records across the current and previous months. Demo storage is browser-local, not secure account storage.
