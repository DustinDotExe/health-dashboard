# Architecture

## Decision

Healthdash uses React, TypeScript, and Vite for the local web application. Phase 1 uses a small Vite development-server plugin for the Omarchy theme endpoint and an in-memory mock `HealthProvider`. Later phases will add a small Node server layer for OAuth, token storage, and Google Health API calls while keeping the browser UI unchanged.

This is a good fit for the target because it runs well on ARM64 Linux, starts with one npm command, has no Electron runtime, supports accessible keyboard interactions in ordinary browser APIs, and keeps the initial dependency surface small. React provides a maintainable component model for the required views; Vite gives fast local feedback and a straightforward production build.

## Runtime shape

```text
Chromium
  -> React dashboard
       -> HealthProvider (mock in Phase 1, Google in Phase 3)
       -> Theme adapter (/api/theme in Phase 1)
       -> AI provider boundary (later phases)

Node/Vite local service
  -> localhost only
  -> OAuth callback and encrypted/local refresh-token storage (Phase 2)
  -> Google Health API v4 (Phase 3)
```

The UI consumes normalized domain data rather than Google response shapes. This keeps charts and baseline calculations independent from the provider and makes missing, unavailable, and failed metrics distinct states.

## Theme integration

Omarchy 4 exposes the active theme name at `~/.local/state/omarchy/current/theme.name` and the active palette at `~/.local/state/omarchy/current/theme/colors.toml`. The adapter reads those files server-side when available, maps Omarchy colors to CSS variables, and falls back to a bundled dark palette. The browser never needs access to the user's home directory.

## Google Health API boundary

The planned provider will use Google Health API REST v4 at `https://health.googleapis.com`. Initial data types are `steps`, `daily-resting-heart-rate`, `daily-heart-rate-variability`, and `sleep`. OAuth will request only read-only activity/fitness, health-metrics/measurements, and sleep scopes. The API is actively evolving and all Google Health scopes are restricted, so setup and verification requirements are documented separately.

## Caching and privacy

Phase 1 has no persistent health cache. The eventual provider may use short-lived in-memory or local derived-value caching to avoid repeated API calls, but it will not copy the full health history. Logs must contain status and error categories only, never tokens or health records. The app binds to `127.0.0.1` by default.
