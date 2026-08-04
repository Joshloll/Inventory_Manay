# Inventory Manay

A Supabase-backed inventory management system for school supplies with Admin and Seller roles.

## Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn-style UI primitives
- React Query for server state
- Supabase Auth, PostgreSQL, RLS, and RPCs
- Recharts for sales analytics

## What is included

- Role-based login and route protection
- Admin dashboard, inventory management, accounts, activity log, and reports views
- Seller inventory browsing, checkout flow, and sales history
- Supabase schema with RLS and atomic stock mutation RPCs
- Seed script for the first admin account
- GitHub Actions lint/type-check workflow

## Setup

1. Copy `.env.example` to `.env` and fill in the Supabase values.
2. Install dependencies with `npm install`.
3. Run the schema locally with the Supabase CLI migrations in `supabase/migrations`.
4. Seed the first admin with `npm run seed:admin`.
5. Start the frontend with `npm run dev`.

## Supabase notes

- `profiles` stores role/status metadata only. Passwords remain in Supabase Auth.
- The `adjust_inventory_transaction` RPC updates stock and inserts the transaction and activity log in one atomic operation.
- Admin account create/deactivate actions are handled by an Edge Function so the service role key never ships to the browser.
- RLS policies restrict seller access to read-only inventory and limit privileged writes to admin-controlled paths.

## Deployment

- Push to GitHub.
- Connect the repo to Vercel or Netlify.
- Set the Supabase URL and anon key in the hosting dashboard.
- Keep the service role key server-side only.
