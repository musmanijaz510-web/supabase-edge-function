# Supabase Edge Function: entries

Edge Function that accepts POST to insert entries and GET to fetch all entries from the `entries` table.

## Prerequisites

- Supabase project created (you already have the DB and table)
- Supabase CLI installed and logged in

## Configure Secrets

Set the required function secrets (never commit these):

```bash
supabase secrets set \
  URL="https://<project-ref>.supabase.co" \
  SERVICE_ROLE_KEY="<your-service-role-key>" \
  CORS_ORIGIN="http://localhost:5173,https://<your-do-app-domain>"
```

- `SUPABASE_SERVICE_ROLE_KEY` is required so the function can write regardless of RLS.
- `CORS_ORIGIN` can be a comma-separated list of allowed origins. Defaults to `*` if not set.

## Deploy

```bash
# from repo root (this folder)
supabase functions deploy entries
```

The function URL will be:

```
https://<project-ref>.functions.supabase.co/entries
```

## Local Dev

```bash
# Start the function locally
supabase functions serve entries --env-file .env --no-verify-jwt
```

Create a `.env` file with the same variables as above when serving locally.
