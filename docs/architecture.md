# Architecture

## Decision

Healthdash uses React, TypeScript, and Vite for the web application. The hosted `sysbody.stream` service owns Google OAuth, refresh-token handling, and Google Health API calls while the browser UI remains provider-agnostic.

This is a good fit for the target because it runs well on ARM64 Linux, starts with one npm command, has no Electron runtime, supports accessible keyboard interactions in ordinary browser APIs, and keeps the initial dependency surface small. React provides a maintainable component model for the required views; Vite gives fast local feedback and a straightforward production build.

## Runtime shape

```text
Chromium
  -> React dashboard
       -> HealthProvider (mock when explicitly used, Google for connected data)
       -> Theme adapter (/api/theme in Phase 1)
       -> AI provider boundary (later phases)

Hosted sysbody.stream service
  -> HTTPS Google OAuth callback
  -> server-side refresh-token storage
  -> Google Health API v4

Omarchy shell plugin
  -> opens sysbody.stream pairing/login in the browser
  -> receives a short-lived plugin credential
  -> GET /api/plugin/health/summary over HTTPS
  -> displays only a small derived signal summary in the native bar
```

The UI consumes normalized domain data rather than Google response shapes. This keeps charts and baseline calculations independent from the provider and makes missing, unavailable, and failed metrics distinct states.

The Omarchy plugin is intentionally a thin native presentation layer. It does
not handle OAuth, read token files, or fetch Google Health directly. A
one-time pairing code associates the plugin with the already-authenticated
sysbody.stream browser session. The plugin API exposes only the date, provider
label, sync time, and the small set of metrics needed by the bar. The plugin
never presents mock values as live health data.

## Theme integration

Omarchy 4 exposes the active theme name at `~/.local/state/omarchy/current/theme.name` and the active palette at `~/.local/state/omarchy/current/theme/colors.toml`. The adapter reads those files server-side when available, maps Omarchy colors to CSS variables, and falls back to a bundled dark palette. The browser never needs access to the user's home directory.

## Google Health API boundary

The provider uses Google Health API REST v4 at `https://health.googleapis.com`. Initial data types are `steps`, `daily-resting-heart-rate`, `daily-heart-rate-variability`, and `sleep`. OAuth requests only read-only activity/fitness, health-metrics/measurements, and sleep scopes. The API is actively evolving and all Google Health scopes are restricted, so setup and verification requirements are documented separately.

## Caching and privacy

The hosted service does not expose raw Google tokens to the plugin. Pairing
credentials expire server-side, and the plugin API returns only normalized
summary data. Logs must contain status and error categories only, never tokens
or health records.
