# Omarchy Health Command Center

## 1. Product Summary

Build a local-first personal health dashboard for an Omarchy Linux laptop.

The dashboard should answer one primary question:

**“How am I doing today?”**

It should retrieve the user's health and fitness data from the Google Health API, present today's most important metrics, compare them with recent personal baselines, and generate a concise AI-assisted Daily Brief.

The application should feel native to Omarchy: minimal, keyboard-driven, dark, terminal-inspired, information-dense without being cluttered, and visually integrated with the user's currently active Omarchy theme.

This is a personal single-user application for V1.

---

# 2. Product Principles

1. **Today first**
   The first screen should communicate the user's current state within approximately five seconds.

2. **Personal baseline over generic targets**
   Emphasize comparisons against the user's own recent history rather than generic population benchmarks.

3. **Minimal command center**
   Important information should be visible immediately. Detailed information should be available through drill-down views.

4. **Keyboard first**
   Every important action must be accessible without a mouse.

5. **Local first**
   The application runs on the user's Omarchy laptop and binds to localhost by default.

6. **API as source of truth**
   Google Health remains the canonical health-data store.

7. **No unnecessary health-data warehouse**
   V1 should fetch health data from the API rather than permanently duplicating the user's health history locally.

8. **Privacy by default**
   Health data and OAuth credentials must never be exposed unnecessarily.

9. **Graceful degradation**
   Missing permissions, unavailable metrics, API errors, or device limitations must not break the dashboard.

10. **No invented health metrics**
    Never fabricate a readiness score or other health metric because the UI specification expects one.

---

# 3. Target Environment

Primary target:

* Omarchy Linux
* ARM64
* MacBook
* Chromium-compatible browser
* localhost application

The architecture should remain portable enough to support other Linux machines later.

Future versions may support:

* LAN access
* phone access
* installable PWA
* remote hosting
* additional health sources

Do not optimize V1 around those future requirements at the expense of simplicity.

---

# 4. Google Health Integration

Use the current Google Health API.

Do NOT build new functionality against the deprecated/legacy Google Fit REST API or legacy Fitbit Web API.

Before implementing the integration, inspect the current official Google Health API documentation.

Use the official documentation as the source of truth for:

* API version
* endpoints
* data types
* OAuth behavior
* scopes
* rate limits
* pagination
* date/time behavior
* rollups
* device/data availability

The application should use read-only permissions.

Likely required scope categories include:

* activity and fitness read
* health metrics and measurements read
* sleep read
* profile/settings read only if required

Request the minimum permissions necessary.

The application must tolerate partial consent.

---

# 5. Authentication

Implement Google OAuth 2.0 Authorization Code flow appropriate for a local web application.

Requirements:

* OAuth secrets must never be committed to Git.
* `.env` must be ignored.
* Provide `.env.example`.
* Store refresh credentials locally and securely.
* Refresh access tokens automatically.
* Provide an obvious reconnect/authentication path.
* Clearly report authentication errors.
* Never print tokens or client secrets to normal application logs.

Initial setup documentation must explain exactly what the user needs to configure in Google Cloud.

---

# 6. Data Architecture

Google Health is the canonical health-data store.

V1 should NOT maintain a permanent copy of the user's full health history.

The application may use:

* in-memory caching
* short-lived local caching
* derived values
* temporary normalized responses

when useful for performance.

Cache behavior should be documented.

Create an internal provider abstraction such as:

`HealthProvider`

The Google implementation should satisfy that interface.

This is intended to make future support for other health sources possible without rewriting the dashboard.

Do not over-engineer the abstraction.

---

# 7. Metric Discovery

Before finalizing implementation, determine which desired metrics are actually exposed by the current Google Health API and available to this user's account.

Desired metrics include:

## Activity

* steps
* active minutes
* active zone minutes
* workouts/exercise
* distance
* calories/activity energy where useful

## Heart

* current/recent heart rate where meaningful
* resting heart rate
* heart-rate variability
* heart-rate zones
* heart-rate trends

## Sleep

* sleep duration
* sleep start/end
* sleep stages if available
* sleep consistency
* sleep-related metrics available through Google Health

## Recovery / Health Metrics

Where available:

* HRV
* resting heart rate
* SpO2
* respiratory rate
* temperature-derived metrics
* VO2 max/cardio fitness
* other relevant supported measurements

## Readiness

First determine whether a Google/Fitbit readiness score is directly available through the API.

If it is available, display the official value and clearly identify its source.

If it is NOT available:

**Do not manufacture a proprietary readiness score in V1.**

Instead, create a Recovery panel containing the underlying signals, such as:

* HRV vs baseline
* resting HR vs baseline
* sleep vs baseline
* activity/recovery context

A future version may implement a documented derived readiness algorithm.

---

# 8. Baselines and Trends

For appropriate metrics calculate:

* today's value
* previous day's value
* 7-day average
* 30-day average
* deviation from 7-day baseline
* deviation from 30-day baseline

Use rolling averages where appropriate.

Avoid misleading comparisons.

For example, compare today's partial step count with expected progress for the current time of day rather than presenting it as equivalent to a completed day whenever feasible.

Handle missing days appropriately.

Do not silently treat missing measurements as zero.

Distinguish:

* true zero
* no measurement
* unavailable metric
* API failure

---

# 9. Main Dashboard

The default route should be:

`Today`

It should approximately follow this information hierarchy:

HEADER

Health / current date / last sync / connection state

PRIMARY CARDS

* Recovery or Readiness
* Steps / Activity
* Resting Heart Rate
* Sleep

SECONDARY SIGNALS

* HRV
* SpO2
* respiratory rate
* active zone minutes
* temperature trend
* other useful available signals

TREND AREA

Compact visualizations showing recent direction.

DAILY BRIEF

Short AI-generated interpretation of today's numbers and notable deviations.

STATUS FOOTER

Keyboard shortcuts, API state, and last refresh.

The interface should remain uncluttered.

Avoid displaying every possible metric simply because the API exposes it.

---

# 10. Detailed Views

Provide dedicated views for:

1. Today
2. Heart
3. Sleep
4. Activity
5. Trends
6. Ask Health

Each view should expose more detailed charts and comparisons than the Today screen.

---

# 11. Keyboard Navigation

The application must be fully usable from the keyboard.

Initial mapping:

`1` — Today

`2` — Heart

`3` — Sleep

`4` — Activity

`5` — Trends

`/` — Ask Health

`r` — Refresh data

`?` — Shortcut/help overlay

`Esc` — Close overlay / return

`j` / `k` — Navigate where appropriate

Avoid overriding normal keyboard behavior when the user is typing into an input.

Create a discoverable shortcut overlay.

---

# 12. Omarchy Theme Integration

The dashboard should visually follow the user's active Omarchy theme.

Do not simply create a generic dark theme and call it Omarchy.

During implementation:

1. Investigate how the installed Omarchy version stores or exposes theme colors.
2. Identify a stable theme source.
3. Build a small theme adapter.
4. Translate Omarchy colors into application CSS variables.

Possible variables:

* `--background`
* `--surface`
* `--foreground`
* `--muted`
* `--accent`
* `--positive`
* `--warning`
* `--critical`
* `--border`

If automatic theme detection fails, fall back gracefully to a bundled dark theme.

The design language should be:

* terminal inspired
* cyberpunk without excessive decoration
* minimal
* high information clarity
* subtle borders
* restrained animation
* excellent typography
* excellent contrast

Avoid:

* excessive neon
* giant gradients
* glassmorphism everywhere
* dashboard-template aesthetics
* excessive rounded cards
* visual noise

The app should feel like a sophisticated terminal command center, not a gaming UI.

---

# 13. Charts

Charts should prioritize interpretation over decoration.

Useful charts include:

* 7-day sparklines
* 30-day trend lines
* baseline bands
* daily comparison bars
* sleep-stage timelines
* heart-rate timelines

Charts should clearly distinguish:

* today's value
* baseline
* direction
* unusual deviation

Use accessible tooltips and labels.

Charts must inherit Omarchy theme colors.

---

# 14. Daily Brief

Build a Daily Brief system that produces a concise interpretation of today's health signals.

The AI provider for V1 should be compatible with the user's existing OpenAI/Codex ecosystem where practical.

However, isolate AI functionality behind an interface so the provider can be replaced later.

The model should receive structured derived data rather than an unnecessarily large dump of raw health records.

Example input:

* today's sleep duration
* 7-day sleep baseline
* today's resting HR
* resting-HR baseline
* today's HRV
* HRV baseline
* steps/current time
* activity trend
* other meaningful deviations

Example desired output:

“Recovery signals look generally stable today. Resting heart rate is 3 bpm below your 7-day average and HRV is slightly above baseline. Sleep duration was 42 minutes below your recent average, while activity is tracking close to normal for this time of day.”

Requirements:

* concise
* evidence-based
* no diagnosis
* no disease claims
* no invented causal relationships
* no alarmist language
* explicitly based on available data

If AI is unavailable, the rest of the dashboard must work normally.

---

# 15. Ask Health

Implement a simple V1 conversational interface accessible with `/`.

Example questions:

* How has my sleep been this week?
* Is my resting heart rate changing?
* How does today compare with my normal Monday?
* What changed most over the last week?
* Am I more active this month?
* Show me my HRV trend.

Architecture:

User question
→ determine required health data
→ fetch/derive data
→ produce structured context
→ LLM interpretation
→ response

Do not send the user's entire health history to the model when a smaller dataset answers the question.

Show which metrics/time period informed the answer.

---

# 16. Privacy and Security

This is health data. Treat it accordingly.

Requirements:

* localhost binding by default
* no analytics
* no telemetry
* no advertising trackers
* no third-party tracking scripts
* no health-data logging
* secrets excluded from Git
* sanitized error messages
* least-privilege OAuth scopes
* read-only Google Health access
* explicit documentation of what information is sent to the AI provider

Do not expose the development server to `0.0.0.0` by default.

---

# 17. Error Handling

Create useful UI states for:

* not authenticated
* expired authentication
* missing permission
* API unavailable
* rate limited
* metric unavailable
* no data today
* insufficient baseline history
* malformed API response
* AI unavailable
* network unavailable

Do not turn missing data into a generic application failure.

---

# 18. Technology Selection

Before coding, evaluate a small number of reasonable implementations.

Prefer:

* TypeScript
* modern web stack
* lightweight local server
* mature charting library
* minimal dependency count

A likely implementation is:

* TypeScript
* React
* Vite or equivalent
* lightweight Node server/API layer
* Tailwind or carefully structured CSS
* lightweight charting library

However:

**Do not choose frameworks mechanically because they appear in this PRD.**

Before implementation, write a brief Architecture Decision Record explaining the chosen stack and why it is appropriate for:

* ARM64 Linux
* localhost operation
* OAuth
* Google Health REST API
* Omarchy theme integration
* keyboard navigation
* future extensibility

Avoid Electron unless a compelling requirement emerges.

---

# 19. Repository Structure

Keep the repository easy for another coding agent to understand.

Include at minimum:

`README.md`

`PRD.md`

`AGENTS.md`

`docs/architecture.md`

`docs/google-health-setup.md`

`docs/privacy.md`

`.env.example`

appropriate source directories

tests

`AGENTS.md` should contain important project-specific instructions for future coding agents.

---

# 20. CLI / Launch Experience

Provide a simple local launch experience.

Development should be straightforward.

Production/local usage should eventually support something similar to:

`healthdash`

which starts the local service and opens the dashboard.

Do not require the user to remember multiple development commands for normal use.

The first implementation may use an npm/pnpm command before the launcher is added.

---

# 21. Implementation Phases

## Phase 0 — Research

Before writing significant application code:

1. Read current Google Health API documentation.
2. Verify OAuth requirements.
3. Verify desired data types.
4. Verify endpoint behavior.
5. Determine whether readiness is exposed.
6. Investigate Omarchy theme configuration.
7. Verify ARM64 compatibility of proposed dependencies.
8. Write `docs/architecture.md`.
9. Create `AGENTS.md`.

Do not guess.

---

## Phase 1 — Skeleton

Create:

* application shell
* routing
* layout
* keyboard navigation
* theme system
* mock health data
* Today screen

Acceptance criterion:

The dashboard runs locally and the UI/UX can be evaluated before Google integration is complete.

---

## Phase 2 — Authentication

Implement Google OAuth.

Acceptance criteria:

* user can connect Google account
* tokens refresh correctly
* secrets aren't committed
* app reports connection state
* logout/reconnect works

Stop here if authentication does not work.

Do not build later API functionality around mocked authentication.

---

## Phase 3 — Google Health Integration

Implement the health provider.

Start with a small number of metrics:

* steps
* resting HR
* HRV
* sleep

Then expand.

Acceptance criterion:

Real values from the user's Google Health account appear in the dashboard.

---

## Phase 4 — Trends

Implement:

* 7-day trends
* 30-day trends
* baseline calculations
* deviation calculations
* charts

Verify calculations with tests.

---

## Phase 5 — Full Today Dashboard

Add the remaining available useful metrics.

Improve:

* information hierarchy
* loading states
* unavailable states
* responsive behavior
* theme integration

---

## Phase 6 — Daily Brief

Add AI-generated daily interpretation.

The AI layer must consume structured derived data.

The dashboard must remain functional if the AI provider is disabled.

---

## Phase 7 — Ask Health

Implement conversational querying over fetched/derived health data.

Start with a narrow supported question set rather than pretending to support arbitrary medical analysis.

---

## Phase 8 — Local Launcher

Provide a convenient launcher appropriate for Omarchy.

Goal:

`healthdash`

starts the application and opens it in the preferred browser.

Document installation and removal.

---

# 22. Testing

Tests should cover at minimum:

* normalization of Google Health responses
* baseline calculations
* missing-data handling
* date/time boundaries
* partial days
* OAuth failure states
* metric availability
* theme parsing
* AI context construction

Use fixtures rather than real health data in automated tests.

Never commit real health data.

---

# 23. Definition of Done for V1

V1 is complete when:

1. Application launches reliably on the target Omarchy ARM64 laptop.
2. User can authenticate with Google.
3. Real Google Health data is displayed.
4. Today screen answers “How am I doing today?”
5. Steps, heart, sleep, and available recovery metrics work.
6. 7-day and 30-day trends work.
7. Missing metrics are handled gracefully.
8. Keyboard navigation works.
9. Dashboard follows the active Omarchy theme or provides a graceful fallback.
10. Daily Brief works.
11. Ask Health supports the initial query set.
12. Secrets and health data are protected.
13. README contains complete setup instructions.
14. Tests pass.
15. No known critical errors appear in normal operation.

---

# 24. Agent Working Instructions

Do not attempt to implement the entire PRD in one pass.

Work milestone by milestone.

For every phase:

1. Inspect existing code.
2. Consult current authoritative documentation where necessary.
3. Write a short implementation plan.
4. Implement the smallest coherent milestone.
5. Run tests.
6. Run lint/type checking.
7. Manually verify the relevant behavior where possible.
8. Fix failures.
9. Summarize what changed.
10. Only then continue.

Do not silently change architectural direction.

If an API capability assumed by this PRD does not exist, document the discrepancy and implement the closest truthful behavior.

Prefer working software over speculative abstractions.

Do not fabricate API responses, health metrics, successful authentication, or test results.

When blocked by something requiring human interaction—particularly Google Cloud configuration, OAuth consent, browser authorization, or credentials—stop and provide the user with exact instructions.

---

# 25. Initial Agent Task

After reading this document:

1. Research the current Google Health API using official Google documentation.
2. Inspect the local Omarchy environment and determine how its active theme is represented.
3. Inspect available development tooling on the machine.
4. Write `docs/architecture.md`.
5. Write `AGENTS.md`.
6. Propose the exact V1 stack.
7. Identify any assumptions in this PRD that conflict with current APIs or the local environment.
8. Present the implementation plan.

Do **not** begin full implementation until this research/bootstrap phase is complete.

After reporting the results, proceed with Phase 1 unless blocked by a decision that genuinely requires user input.

