# Healthdash agent notes

## Project intent

Healthdash is a local-first, single-user health dashboard for an Omarchy Linux laptop. The PRD is the source of truth. Keep the interface keyboard-first, terminal-inspired, readable, and honest about missing or unavailable health data.

## Development

- Use Node.js and npm. `npm install` installs dependencies.
- `npm run dev` starts the local Vite application on `127.0.0.1`.
- `npm run check` runs TypeScript, tests, and the production build.
- Never commit `.env`, OAuth credentials, refresh tokens, or real health data.
- Use fixtures and mock providers for automated tests.

## Architectural boundaries

- Keep health access behind the `HealthProvider` interface.
- Keep AI access behind a replaceable interface and pass derived context rather than raw history.
- Google Health API is the canonical source. Do not add a permanent health-data warehouse.
- Do not invent readiness or other health metrics. If an API value is unavailable, show the underlying signals and the reason.

## Change workflow

Read `PRD.md` before making product or architecture changes. Prefer small, reviewable milestones and run `npm run check` before committing. Keep localhost binding as the default and avoid logging health data or secrets.
