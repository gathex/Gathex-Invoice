# GATHEX Invoice

GST-compliant invoicing SaaS built for Indian freelancers, small manufacturers, and service providers — unified invoices, quotations, credit/debit notes, delivery challans, and purchase orders, with automatic CGST/SGST/IGST calculation, UPI QR payments, and payment reminders.

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Realtime) — see `FINAL_SCHEMA.sql` for the database schema
- jsPDF + html2canvas-pro for PDF invoice export
- Recharts for dashboard analytics

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up Supabase:
   - Create a project at [supabase.com](https://supabase.com)
   - Run `FINAL_SCHEMA.sql` in the SQL Editor (and any numbered migration files present in the repo root, in order)
3. Create `.env.local` in the project root:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
4. Run the app:
   ```bash
   npm run dev
   ```

## Deployment

Deployed on Vercel. Remember to set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project settings (Production environment), and update Supabase Authentication → URL Configuration (Site URL + Redirect URLs) to match your production domain.

## License

Private project — not licensed for redistribution.
