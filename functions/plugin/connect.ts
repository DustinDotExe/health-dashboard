import type { HealthdashEnv } from "../_lib/types";

const page = (title: string, body: string) => new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>body{font:16px system-ui;max-width:36rem;margin:15vh auto;padding:2rem;background:#111;color:#eee}a{display:inline-block;padding:.8rem 1rem;background:#8ff;color:#111;text-decoration:none;border-radius:.4rem}small{color:#aaa}</style></head><body>${body}</body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

export const onRequestGet = async ({ request, env }: { request: Request; env: HealthdashEnv }) => {
  const url = new URL(request.url);
  const pair = url.searchParams.get("pair");
  if (!pair || !/^[a-f0-9-]{32,80}$/i.test(pair)) return page("Healthdash plugin", "<h1>Invalid pairing code</h1><p>Start the connection again from the Omarchy bar.</p>");
  if (url.searchParams.get("complete") === "1") return page("Healthdash connected", "<h1>Healthdash connected</h1><p>You can close this tab and return to Omarchy.</p>");
  if (!env.HEALTHDASH_AUTH) return page("Healthdash plugin", "<h1>Connection unavailable</h1><p>The Healthdash account service is not configured.</p>");
  return page("Connect Healthdash", `<h1>Connect Healthdash</h1><p>Sign in with Google to authorize the native Omarchy plugin.</p><p><a href="/auth/google/start?pair=${encodeURIComponent(pair)}">Continue with Google</a></p><small>This grants the plugin access to the same read-only Healthdash summary used by sysbody.stream.</small>`);
};
