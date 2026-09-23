import { json } from "../../_lib/json";
import type { HealthdashEnv } from "../../_lib/types";

export const onRequestGet = async ({ env }: { env: HealthdashEnv }) => {
  if (env.HEALTHDASH_AUTH) await env.HEALTHDASH_AUTH.delete("google-auth");
  return json({ connected: false });
};
