import { json } from "../../../_lib/json";
import { today } from "../../../_lib/google-health";
import type { HealthdashEnv } from "../../../_lib/types";

export const onRequestGet = async ({ request, env }: { request: Request; env: HealthdashEnv }) => {
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token || !env.HEALTHDASH_AUTH) return json({ error: "plugin-auth-required" }, 401);
  const valid = await env.HEALTHDASH_AUTH.get(`plugin-token:${token}`, "text");
  if (!valid) return json({ error: "plugin-auth-expired" }, 401);
  try {
    const snapshot = await today(env);
    return json({
      date: snapshot.date,
      source: snapshot.source,
      syncedAt: snapshot.syncedAt,
      steps: snapshot.steps,
      restingHeartRate: snapshot.restingHeartRate,
      hrv: snapshot.hrv,
      sleep: snapshot.sleep,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "health-api-failed";
    return json({ error: reason }, reason.includes("auth") ? 401 : 502);
  }
};
