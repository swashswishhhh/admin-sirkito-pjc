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

### Zoho CRM (Vercel / server)

The API route reads these **exact** names (all caps, underscores):

| Variable | Required | Notes |
|----------|----------|--------|
| `ZOHO_CLIENT_ID` | Yes | From Zoho API Console |
| `ZOHO_CLIENT_SECRET` | Yes | From Zoho API Console |
| `ZOHO_REFRESH_TOKEN` | **Yes** | Used to obtain short-lived access tokens (see below) |
| `ZOHO_ACCOUNTS_URL` | No | Default `https://accounts.zoho.com`. EU: `https://accounts.zoho.eu` |
| `ZOHO_API_DOMAIN` | No | Default `https://www.zohoapis.com`. EU: `https://www.zohoapis.eu` |

**Why you see “Missing Zoho credentials”:** Client ID and Secret alone are not enough. Zoho’s OAuth flow requires a **refresh token** (`ZOHO_REFRESH_TOKEN`) so the server can call `POST …/oauth/v2/token` with `grant_type=refresh_token`.

**How to get `ZOHO_REFRESH_TOKEN` (high level):**

1. In **[Zoho API Console](https://api-console.zoho.com/)**, create a **Server-based** client (or use **Self Client** if your org allows it).
2. Note **Client ID** and **Client Secret**.
3. Set a **redirect URI** (e.g. `https://localhost` or your app URL) as required by Zoho.
4. Open this URL in a browser (replace placeholders; adjust host for EU: `accounts.zoho.eu`):

   `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=YOUR_ENCODED_REDIRECT_URI`

5. After you approve, copy the **`code`** from the redirect URL query string.
6. Exchange the code for tokens with a one-time `curl` or Postman request to  
   `POST https://accounts.zoho.com/oauth/v2/token`  
   with `grant_type=authorization_code`, `client_id`, `client_secret`, `redirect_uri`, and `code`. The JSON response includes **`refresh_token`**.
7. In **Vercel** → your project → **Settings** → **Environment Variables**, add:
   - `ZOHO_REFRESH_TOKEN` = that refresh token value  
   - Ensure `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` match the same Zoho client.  
   Scope “All Environments” or at least **Production**, then **Redeploy** so the new variable is available at runtime.

**Production checklist:** Variables must exist for the environment that serves the deployment (e.g. Production). After adding or changing secrets, trigger a new deployment.

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
