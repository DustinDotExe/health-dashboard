# Cloudflare Functions setup

The public frontend is deployed through Cloudflare Pages. The `functions/` directory contains the server-side OAuth and Google Health API routes; it is intentionally separate from the browser bundle.

Before enabling live data in Pages, configure these production environment variables under the Pages project:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://sysbody.stream/auth/google/callback
```

Create a Cloudflare KV namespace and bind it to the Pages project as:

```text
HEALTHDASH_AUTH
```

Do not put Google secrets in `VITE_*` variables or commit them to Git. Keep the Google OAuth app restricted to the owner/test account while the Health API integration is being verified.

The Pages Functions routes are:

```text
GET /api/auth/status
GET /auth/google/start
GET /auth/google/callback
GET /auth/google/logout
GET /api/health/today
```

Until these bindings and variables are configured, the frontend remains on mock data and the functions return explicit configuration errors.
