import { readFile } from "node:fs/promises";
import { mkdir, readFile as readTokenFile, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

const themePlugin = (): Plugin => ({
  name: "healthdash-omarchy-theme",
  configureServer(server) {
    server.middlewares.use("/api/theme", async (_request, response) => {
      try {
        const stateRoot = resolve(homedir(), ".local/state/omarchy/current");
        const [name, colors] = await Promise.all([
          readFile(resolve(stateRoot, "theme.name"), "utf8"),
          readFile(resolve(stateRoot, "theme/colors.toml"), "utf8"),
        ]);
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ name: name.trim(), colors }));
      } catch {
        response.statusCode = 404;
        response.end(JSON.stringify({ error: "theme-unavailable" }));
      }
    });
  },
});

type StoredTokens = {
  refreshToken: string;
  scope?: string;
  tokenType?: string;
};

type CachedAccessToken = { value: string; expiresAt: number };
let cachedAccessToken: CachedAccessToken | null = null;
const pendingOAuthStates = new Map<string, number>();

const tokenPath = resolve(homedir(), ".config/healthdash/tokens.json");

const cookieValue = (cookieHeader: string | undefined, name: string) =>
  cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);

const json = (response: import("node:http").ServerResponse, status: number, body: unknown) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
};

const readStoredTokens = async (): Promise<StoredTokens | null> => {
  try {
    return JSON.parse(await readTokenFile(tokenPath, "utf8")) as StoredTokens;
  } catch {
    return null;
  }
};

const accessToken = async (env: Record<string, string>) => {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) return cachedAccessToken.value;
  const tokens = await readStoredTokens();
  if (!tokens?.refreshToken || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("google-auth-not-configured");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("google-token-refresh-failed");
  const refreshed = await response.json() as { access_token?: string; expires_in?: number };
  if (!refreshed.access_token) throw new Error("google-access-token-missing");
  cachedAccessToken = { value: refreshed.access_token, expiresAt: Date.now() + (refreshed.expires_in ?? 3600) * 1000 };
  return refreshed.access_token;
};

const healthData = async (token: string, dataType: string, filter: string, pageSize = "10000") => {
  const url = new URL(`https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints`);
  url.searchParams.set("pageSize", pageSize);
  url.searchParams.set("filter", filter);
  const dataPoints: Record<string, unknown>[] = [];
  let pageToken: string | undefined;
  do {
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (!response.ok) throw new Error(`health-api-${response.status}`);
    const page = await response.json() as { dataPoints?: Record<string, unknown>[]; nextPageToken?: string };
    dataPoints.push(...(page.dataPoints ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return { dataPoints };
};

const numberMetric = (value: number | undefined, unit: string): { state: "available" | "no-data"; value?: number; unit: string; baseline?: number } => value === undefined
  ? { state: "no-data", unit }
  : { state: "available", value, unit };

const localCivilDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return parts.reduce<Record<string, string>>((values, part) => {
    if (part.type !== "literal") values[part.type] = part.value;
    return values;
  }, {});
};

const civilDateValue = (date: Date) => {
  const parts = localCivilDate(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const shiftCivilDate = (date: string, days: number) => {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

const pointCivilDate = (point: Record<string, unknown>, field: string) => {
  const value = point[field] as {
    date?: { year?: number; month?: number; day?: number };
    interval?: {
      civilStartTime?: { date?: { year?: number; month?: number; day?: number } };
      civilEndTime?: { date?: { year?: number; month?: number; day?: number } };
    };
  } | undefined;
  const date = value?.date ?? value?.interval?.civilStartTime?.date ?? value?.interval?.civilEndTime?.date;
  return date?.year && date.month && date.day
    ? `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
    : undefined;
};

const unavailableMetric = (unit: string, note: string) => ({ state: "unavailable" as const, unit, note });

const googleToday = async (env: Record<string, string>) => {
  const token = await accessToken(env);
  const now = new Date();
  const today = civilDateValue(now);
  const weekAgo = shiftCivilDate(today, -7);
  const tomorrow = shiftCivilDate(today, 1);
  const dayFilter = (field: string) => `${field} >= "${weekAgo}" AND ${field} < "${tomorrow}"`;
  const query = (dataType: string, filter: string, pageSize?: string) => healthData(token, dataType, filter, pageSize).catch(() => null);

  const [stepsResult, restingResult, hrvResult, sleepResult] = await Promise.all([
    query("steps", dayFilter("steps.interval.civil_start_time")),
    query("daily-resting-heart-rate", dayFilter("daily_resting_heart_rate.date"), "100"),
    query("daily-heart-rate-variability", dayFilter("daily_heart_rate_variability.date"), "100"),
    query("sleep", `sleep.interval.civil_end_time >= "${weekAgo}" AND sleep.interval.civil_end_time < "${tomorrow}"`, "25"),
  ]);

  const stepsPoints = stepsResult?.dataPoints ?? [];
  const todaySteps = stepsPoints.reduce((total, point) => {
    const steps = point.steps as { count?: string; interval?: { startTime?: string } } | undefined;
    return pointCivilDate(point, "steps") === today ? total + Number(steps?.count ?? 0) : total;
  }, 0);
  const recentSteps = stepsPoints.reduce<Record<string, number>>((days, point) => {
    const steps = point.steps as { count?: string; interval?: { startTime?: string } } | undefined;
    const date = pointCivilDate(point, "steps");
    if (date) days[date] = (days[date] ?? 0) + Number(steps?.count ?? 0);
    return days;
  }, {});
  const recentDates = Object.keys(recentSteps).sort().slice(-7);
  const averageSteps = recentDates.length ? recentDates.reduce((sum, date) => sum + recentSteps[date], 0) / recentDates.length : undefined;
  const latest = <T,>(points: Record<string, unknown>[], key: string, valueKey: string): T | undefined => {
    const candidates = points.map((point) => point[key] as Record<string, unknown> | undefined).filter(Boolean);
    return candidates.length ? candidates[candidates.length - 1]?.[valueKey] as T : undefined;
  };
  const resting = latest<string>(restingResult?.dataPoints ?? [], "dailyRestingHeartRate", "beatsPerMinute");
  const hrv = latest<number>(hrvResult?.dataPoints ?? [], "dailyHeartRateVariability", "averageHeartRateVariabilityMilliseconds");
  const sleepPoints = sleepResult?.dataPoints ?? [];
  const sleep = sleepPoints.length ? (sleepPoints[sleepPoints.length - 1].sleep as { summary?: { minutesAsleep?: string }; interval?: { startTime?: string; endTime?: string } } | undefined) : undefined;
  const sleepHours = sleep?.summary?.minutesAsleep ? Number(sleep.summary.minutesAsleep) / 60 : sleep?.interval?.startTime && sleep.interval.endTime ? (Date.parse(sleep.interval.endTime) - Date.parse(sleep.interval.startTime)) / 3_600_000 : undefined;
  const restingNumber = resting === undefined ? undefined : Number(resting);
  const stepMetric = numberMetric(todaySteps || undefined, "steps");
  if (averageSteps !== undefined) stepMetric.baseline = averageSteps;

  return {
    date: now.toISOString().slice(0, 10),
    steps: stepsResult ? stepMetric : unavailableMetric("steps", "Google Health steps are unavailable."),
    restingHeartRate: restingResult ? numberMetric(restingNumber, "bpm") : unavailableMetric("bpm", "Google Health resting heart rate is unavailable."),
    hrv: hrvResult ? numberMetric(hrv, "ms") : unavailableMetric("ms", "Google Health HRV is unavailable."),
    sleep: sleepResult ? numberMetric(sleepHours, "hours") : unavailableMetric("hours", "Google Health sleep is unavailable."),
    activeZoneMinutes: unavailableMetric("min", "Not fetched yet."),
    oxygenSaturation: unavailableMetric("%", "Not fetched yet."),
    respiratoryRate: unavailableMetric("brpm", "Not fetched yet."),
    trend: recentDates.map((date) => recentSteps[date]).filter((value) => Number.isFinite(value)),
    source: "google-health" as const,
    syncedAt: new Date().toISOString(),
  };
};

const authPlugin = (env: Record<string, string>): Plugin => ({
  name: "healthdash-google-oauth",
  configureServer(server) {
    server.middlewares.use("/auth/google/start", (_request, response) => {
      const clientId = env.GOOGLE_CLIENT_ID;
      const redirectUri = env.GOOGLE_REDIRECT_URI;
      if (!clientId || !redirectUri) {
        json(response, 500, { error: "oauth-not-configured" });
        return;
      }

      const state = randomBytes(32).toString("hex");
      pendingOAuthStates.set(state, Date.now() + 10 * 60_000);
      const scopes = [
        "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
        "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
        "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
      ];
      const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authorization.searchParams.set("client_id", clientId);
      authorization.searchParams.set("redirect_uri", redirectUri);
      authorization.searchParams.set("response_type", "code");
      authorization.searchParams.set("access_type", "offline");
      authorization.searchParams.set("include_granted_scopes", "true");
      authorization.searchParams.set("state", state);
      authorization.searchParams.set("scope", scopes.join(" "));
      response.statusCode = 302;
      response.setHeader("Set-Cookie", `healthdash_oauth_state=${state}; Max-Age=600; HttpOnly; SameSite=Lax; Path=/${redirectUri.startsWith("https://") ? "; Secure" : ""}`);
      response.setHeader("Location", authorization.toString());
      response.end();
    });

    server.middlewares.use("/auth/google/callback", async (request, response) => {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const state = requestUrl.searchParams.get("state");
      const code = requestUrl.searchParams.get("code");
      const storedState = cookieValue(request.headers.cookie, "healthdash_oauth_state");
      const stateExpiresAt = state ? pendingOAuthStates.get(state) : undefined;
      const stateIsValid = Boolean(state && stateExpiresAt && stateExpiresAt > Date.now() && (state === storedState || pendingOAuthStates.has(state)));
      if (!stateIsValid) {
        json(response, 400, { error: "invalid-oauth-state" });
        return;
      }
      pendingOAuthStates.delete(state!);
      if (!code) {
        json(response, 400, { error: requestUrl.searchParams.get("error") ?? "missing-authorization-code" });
        return;
      }

      try {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: env.GOOGLE_REDIRECT_URI,
            grant_type: "authorization_code",
          }),
        });
        if (!tokenResponse.ok) {
          json(response, 502, { error: "oauth-token-exchange-failed" });
          return;
        }
        const token = await tokenResponse.json() as { refresh_token?: string; scope?: string; token_type?: string };
        if (!token.refresh_token) {
          json(response, 502, { error: "oauth-refresh-token-missing" });
          return;
        }
        await mkdir(resolve(homedir(), ".config/healthdash"), { recursive: true, mode: 0o700 });
        await writeFile(tokenPath, JSON.stringify({ refreshToken: token.refresh_token, scope: token.scope, tokenType: token.token_type }), { mode: 0o600 });
        response.statusCode = 302;
        response.setHeader("Set-Cookie", "healthdash_oauth_state=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/");
        response.setHeader("Location", "/?auth=connected");
        response.end();
      } catch {
        json(response, 502, { error: "oauth-callback-failed" });
      }
    });

    server.middlewares.use("/api/auth/status", async (_request, response) => {
      const tokens = await readStoredTokens();
      json(response, 200, { connected: Boolean(tokens?.refreshToken), scopes: tokens?.scope?.split(" ") ?? [] });
    });

    server.middlewares.use("/auth/google/logout", async (_request, response) => {
      try { await unlink(tokenPath); } catch { /* Already disconnected. */ }
      json(response, 200, { connected: false });
    });

    server.middlewares.use("/api/health/today", async (_request, response) => {
      try {
        json(response, 200, await googleToday(env));
      } catch (error) {
        const reason = error instanceof Error ? error.message : "health-api-failed";
        const status = reason === "google-auth-not-configured" || reason === "google-token-refresh-failed" ? 401 : 502;
        json(response, status, { error: reason });
      }
    });
  },
});

const env = loadEnv("development", process.cwd(), "");
const redirectHost = env.GOOGLE_REDIRECT_URI ? new URL(env.GOOGLE_REDIRECT_URI).hostname : undefined;

export default defineConfig({
  plugins: [react(), themePlugin(), authPlugin(env)],
  server: { host: "127.0.0.1", allowedHosts: redirectHost ? [redirectHost] : [] },
});
