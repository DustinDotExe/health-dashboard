# Google Health setup

Healthdash is not connected to Google Health in Phase 1. This document records the setup needed for Phase 2.

1. Create or select a Google Cloud project and enable the Google Health API.
2. Create a Google OAuth 2.0 client ID for a web server application.
3. Configure the local callback URL used by the app (the Phase 2 implementation will document the exact port and path).
4. Leave the OAuth app in Testing mode and add the Google account that owns the health data as a test user.
5. Configure only the read-only Google Health scopes required by the enabled dashboard metrics:
   - `https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly`
   - `https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly`
   - `https://www.googleapis.com/auth/googlehealth.sleep.readonly`
6. Put the client ID and client secret in `.env`, never in Git.

The current API is Google Health API REST v4 at `https://health.googleapis.com`. Google documents its scopes as restricted, so broader distribution or production use may require Google's privacy and security review. The local single-user testing path should use a test user and least-privilege read-only access.

The app must tolerate partial consent. If a user does not grant a scope, the affected metric is unavailable and the rest of the dashboard remains usable.
