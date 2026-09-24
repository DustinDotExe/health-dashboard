# Healthdash

Healthdash is a local-first personal health command center for Omarchy Linux. It answers “How am I doing today?” with a compact, keyboard-first dashboard designed to follow the active Omarchy palette.

The UI shell supports clearly labeled mock data. Google Health login and live read-only data access are owned by the hosted `sysbody.stream` service. See [docs/google-health-setup.md](docs/google-health-setup.md) for setup requirements.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm install
npm run dev
```

Open the printed localhost URL in Chromium. The development server binds to `127.0.0.1`. Use `npm run check` for tests and a production build.

## Omarchy bar plugin

Healthdash includes a native Omarchy `bar-widget` and themed quick panel in [omarchy-plugin](omarchy-plugin/). Clicking the bar item opens the panel; the first click also opens `sysbody.stream` for Google login. After pairing, it polls a privacy-minimized HTTPS summary. Before connection it shows `♥ + Connect`; it does not display mock health values.

Validate and install it for the current user with:

```sh
omarchy plugin validate omarchy-plugin
mkdir -p ~/.config/omarchy/plugins/healthdash.health
cp omarchy-plugin/manifest.json omarchy-plugin/Healthdash.qml ~/.config/omarchy/plugins/healthdash.health/
omarchy-shell shell rescanPlugins
omarchy plugin enable healthdash.health
```

The widget uses `https://sysbody.stream` by default. See [omarchy-plugin/README.md](omarchy-plugin/README.md) for configuration details.

## Keyboard controls

`1`–`5` switch between Today, Heart, Sleep, Activity, and Trends. `/` opens Ask Health, `r` refreshes, `?` opens the shortcut map, and `Esc` closes it.

## Project docs

- [PRD.md](PRD.md) — product source of truth
- [docs/architecture.md](docs/architecture.md) — stack and system boundaries
- [docs/google-health-setup.md](docs/google-health-setup.md) — Google Health OAuth setup
- [docs/privacy.md](docs/privacy.md) — local data and AI privacy model
- [AGENTS.md](AGENTS.md) — instructions for future coding agents
