import type { HealthdashEnv } from "../_lib/types";

const page = (title: string, body: string) => new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="theme-color" content="#0b0b0b"><title>${title}</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{max-width:36rem;margin:15vh auto;padding:2rem;background:#0b0b0b;color:#f5f5f5;font:16px ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.55}h1{margin:0 0 1rem;font-size:1.3rem;font-weight:500;letter-spacing:.04em}p{color:#d4d4d4}a{display:inline-block;margin-top:.4rem;padding:.75rem 1rem;border:1px solid #f5f5f5;background:#f5f5f5;color:#0b0b0b;text-decoration:none;font-weight:600}a:hover{background:#d4d4d4;border-color:#d4d4d4}small{display:block;margin-top:1.5rem;color:#a3a3a3;font-size:.78rem}</style></head><body>${body}</body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

export const onRequestGet = async ({ request, env }: { request: Request; env: HealthdashEnv }) => {
  const url = new URL(request.url);
  const pair = url.searchParams.get("pair");
  if (!pair || !/^[a-f0-9-]{32,80}$/i.test(pair)) return page("Healthdash plugin", "<h1>Invalid pairing code</h1><p>Start the connection again from the Omarchy bar.</p>");
  if (url.searchParams.get("complete") === "1") return page("Healthdash connected", "<h1>Healthdash connected</h1><p>You can close this tab and return to Omarchy.</p>");
  if (!env.HEALTHDASH_AUTH) return page("Healthdash plugin", "<h1>Connection unavailable</h1><p>The Healthdash account service is not configured.</p>");
  return page("Connect Healthdash", `<h1>Connect Healthdash</h1><p>Sign in with Google to authorize the native Omarchy plugin.</p><p><a href="/auth/google/start?pair=${encodeURIComponent(pair)}">Continue with Google</a></p><small>This grants the plugin access to the same read-only Healthdash summary used by sysbody.stream.</small>`);
};
