import { json } from "../../../_lib/json";
import type { HealthdashEnv } from "../../../_lib/types";

export const onRequestGet = async ({ request, env }: { request: Request; env: HealthdashEnv }) => {
  const pair = new URL(request.url).searchParams.get("pair");
  if (!pair || !/^[a-f0-9-]{32,80}$/i.test(pair)) return json({ error: "invalid-pairing-code" }, 400);
  if (!env.HEALTHDASH_AUTH) return json({ error: "plugin-not-configured" }, 503);
  const token = await env.HEALTHDASH_AUTH.get(`plugin-pair:${pair}`, "text") as string | null;
  if (!token) return json({ status: "pending" });
  await env.HEALTHDASH_AUTH.put(`plugin-token:${token}`, "active", { expirationTtl: 30 * 24 * 60 * 60 });
  await env.HEALTHDASH_AUTH.delete(`plugin-pair:${pair}`);
  return json({ status: "authorized", token });
};
