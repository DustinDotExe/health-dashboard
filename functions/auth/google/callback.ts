import { configured, json } from "../../_lib/json";
import type { HealthdashEnv } from "../../_lib/types";

const cookie = (request: Request, name: string) => request.headers.get("Cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);

export const onRequestGet = async ({ request, env }: { request: Request; env: HealthdashEnv }) => {
  if (!configured(env) || !env.HEALTHDASH_AUTH) return json({ error: "oauth-not-configured" }, 503);
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!state || state !== cookie(request, "healthdash_oauth_state")) return json({ error: "invalid-oauth-state" }, 400);
  if (!code) return json({ error: url.searchParams.get("error") ?? "missing-authorization-code" }, 400);

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) return json({ error: "oauth-token-exchange-failed" }, 502);
    const token = await tokenResponse.json() as { refresh_token?: string; scope?: string; token_type?: string };
    if (!token.refresh_token) return json({ error: "oauth-refresh-token-missing" }, 502);
    await env.HEALTHDASH_AUTH.put("google-auth", JSON.stringify({ refreshToken: token.refresh_token, scope: token.scope, tokenType: token.token_type }));
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/?auth=connected",
        "Set-Cookie": "healthdash_oauth_state=; Max-Age=0; HttpOnly; SameSite=Lax; Secure; Path=/",
      },
    });
  } catch {
    return json({ error: "oauth-callback-failed" }, 502);
  }
};
