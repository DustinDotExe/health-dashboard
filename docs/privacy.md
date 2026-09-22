# Privacy model

Healthdash is designed for one person on one laptop.

- The local service binds to `127.0.0.1` by default.
- There is no analytics, telemetry, advertising, or third-party tracking script.
- Google Health remains the source of truth. Phase 1 has no persistent health-data store; later phases may cache derived values briefly for performance.
- OAuth secrets and refresh credentials stay outside Git in `.env` or a local credential store.
- Application logs contain operational status and sanitized error categories, never health records, access tokens, refresh tokens, or client secrets.
- The Daily Brief and Ask Health features will send only the smallest structured derived context needed to the configured AI provider. The UI will identify that provider and whether AI is unavailable.
- Google Health access is read-only in V1.

Never use real health data in fixtures, screenshots committed to the repository, or automated tests.
