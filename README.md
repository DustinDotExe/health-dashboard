# Healthdash

Healthdash is a local-first personal health command center for Omarchy Linux. It answers “How am I doing today?” with a compact, keyboard-first dashboard designed to follow the active Omarchy palette.

Phase 1 is a reviewable UI shell using clearly labeled mock data. Google Health OAuth and live data are deliberately staged for the next milestones; see [docs/google-health-setup.md](docs/google-health-setup.md) for the researched setup requirements.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm install
npm run dev
```

Open the printed localhost URL in Chromium. The development server binds to `127.0.0.1`. Use `npm run check` for tests and a production build.

## Keyboard controls

`1`–`5` switch between Today, Heart, Sleep, Activity, and Trends. `/` opens Ask Health, `r` refreshes, `?` opens the shortcut map, and `Esc` closes it.

## Project docs

- [PRD.md](PRD.md) — product source of truth
- [docs/architecture.md](docs/architecture.md) — stack and system boundaries
- [docs/google-health-setup.md](docs/google-health-setup.md) — OAuth setup for Phase 2
- [docs/privacy.md](docs/privacy.md) — local data and AI privacy model
- [AGENTS.md](AGENTS.md) — instructions for future coding agents
