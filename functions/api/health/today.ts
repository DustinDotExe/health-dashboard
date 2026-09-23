import { json } from "../../_lib/json";
import { today } from "../../_lib/google-health";
import type { HealthdashEnv } from "../../_lib/types";

export const onRequestGet = async ({ env }: { env: HealthdashEnv }) => {
  try {
    return json(await today(env));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "health-api-failed";
    const status = reason === "google-auth-not-configured" || reason === "google-token-refresh-failed" ? 401 : 502;
    return json({ error: reason }, status);
  }
};
