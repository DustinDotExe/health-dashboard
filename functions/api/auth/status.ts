import { configured, json } from "../../_lib/json";
import type { HealthdashEnv } from "../../_lib/types";

export const onRequestGet = async ({ env }: { env: HealthdashEnv }) => {
  const auth = env.HEALTHDASH_AUTH ? await env.HEALTHDASH_AUTH.get("google-auth", "json") : null;
  return json({
    connected: Boolean(auth?.refreshToken),
    configured: configured(env) && Boolean(env.HEALTHDASH_AUTH),
    scopes: auth?.scope?.split(" ") ?? [],
  });
};
