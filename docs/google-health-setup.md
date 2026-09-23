# Google Health setup

Google login is handled by the hosted `sysbody.stream` application. The
Omarchy plugin does not use a local redirect URI or store Google refresh
tokens.

## Configure the hosted app

1. Create or select a Google Cloud project and enable the Google Health API.
2. Create or use the production OAuth client for `sysbody.stream`.
3. Keep the existing production redirect URI unchanged:
   `https://sysbody.stream/auth/google/callback`.
4. Leave the OAuth app in Testing mode and add the Google account that owns the
   health data as a test user.
5. Configure only the required read-only scopes:

   - `https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly`
   - `https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly`
   - `https://www.googleapis.com/auth/googlehealth.sleep.readonly`

6. Configure the Google client ID, client secret, redirect URI, and
   `HEALTHDASH_AUTH` KV binding in the Cloudflare Pages project. See
   [docs/cloudflare-functions-setup.md](cloudflare-functions-setup.md).

Google Health uses REST v4 at `https://health.googleapis.com`. Its scopes are
restricted, so broader distribution or production use may require Google
review. The local single-user testing path should use a test user and
least-privilege read-only access.

## Connect the Omarchy plugin

Click `♥ + Connect` in the bar. The plugin opens
`https://sysbody.stream/plugin/connect?pair=...` in Chromium. Complete Google
login there, then close the browser tab when it reports success. The plugin
receives a short-lived pairing credential and begins polling the normalized
summary endpoint.

If a requested scope is not granted, the affected metric must remain
unavailable while the rest of the dashboard continues to work.
