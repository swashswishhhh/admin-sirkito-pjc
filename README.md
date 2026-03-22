# Sirkito EBC Opportunity ID Management & Tracking

Internal admin tool to create, revise, and track **version-controlled Opportunity records**.

## ID Format

`Q26-E0002-V1`

- `Q26` = fixed company prefix
- `E0002` = base sequence (4 digits, zero padded; `E` letter is fixed)
- `V1` = version (new records start at `V1`, revise increments `V2`, `V3`, ...)

## Version Rules

- New Opportunity: always starts at `V1`
- Revision: keeps the same base ID (`Q26-E0002`) and increments version (`V2`, `V3`, ...)

The UI displays a full table (project name, location, client, contact, VAT, amounts, status) and lets you copy the full ID by clicking it.

## Environment variables

Copy `.env.example` to `.env.local` and fill in values.

- **`NEXT_PUBLIC_SUPABASE_URL`** / **`NEXT_PUBLIC_SUPABASE_ANON`** — used for the Supabase project URL and anon key (the app reads these on the server for API routes and they must match your Supabase dashboard).
- **`SUPABASE_SERVICE_ROLE`** (recommended for production) — server-only; add in Vercel **without** the `NEXT_PUBLIC_` prefix. The `/api/opportunities` route uses this key when set so **Row Level Security** does not block inserts or the `insert … returning` row. If you omit it, the route falls back to the anon key (then you must allow insert/select via RLS policies). The legacy name `SUPABASE_SERVICE_ROLE_KEY` still works.

Zoho sync runs **after** a successful Supabase insert; if Zoho fails, the row still remains in Supabase.

## Run Locally

```bash
npm run dev
```

Then open the URL shown in your terminal (typically `http://localhost:3000`).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
