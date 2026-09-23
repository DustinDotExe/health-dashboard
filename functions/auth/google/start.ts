import { configured, json } from "../../_lib/json";
import type { HealthdashEnv } from "../../_lib/types";

const scopes = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
];

export const onRequestGet = async ({ env }: { env: HealthdashEnv }) => {
  if (!configured(env) || !env.HEALTHDASH_AUTH) return json({ error: "oauth-not-configured" }, 503);
  const state = crypto.randomUUID();
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  authorization.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI!);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("access_type", "offline");
  authorization.searchParams.set("prompt", "consent");
  authorization.searchParams.set("include_granted_scopes", "true");
  authorization.searchParams.set("state", state);
  authorization.searchParams.set("scope", scopes.join(" "));
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorization.toString(),
      "Set-Cookie": `healthdash_oauth_state=${state}; Max-Age=600; HttpOnly; SameSite=Lax; Secure; Path=/`,
    },
  });
};
