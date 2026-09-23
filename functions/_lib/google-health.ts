import type { AuthRecord, HealthdashEnv } from "./types";

type DataPoint = Record<string, any>;

const AUTH_KEY = "google-auth";

const readAuth = async (env: HealthdashEnv): Promise<AuthRecord | null> => env.HEALTHDASH_AUTH
  ? env.HEALTHDASH_AUTH.get(AUTH_KEY, "json")
  : null;

const accessToken = async (env: HealthdashEnv) => {
  const auth = await readAuth(env);
  if (!auth?.refreshToken || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("google-auth-not-configured");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: auth.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("google-token-refresh-failed");
  const token = await response.json() as { access_token?: string };
  if (!token.access_token) throw new Error("google-access-token-missing");
  return token.access_token;
};

const healthData = async (token: string, dataType: string, filter: string, pageSize = "10000") => {
  const url = new URL(`https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints`);
  url.searchParams.set("pageSize", pageSize);
  url.searchParams.set("filter", filter);
  const dataPoints: DataPoint[] = [];
  let pageToken: string | undefined;
  do {
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (!response.ok) throw new Error(`health-api-${response.status}`);
    const page = await response.json() as { dataPoints?: DataPoint[]; nextPageToken?: string };
    dataPoints.push(...(page.dataPoints ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return dataPoints;
};

const civilDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const shiftDate = (date: string, days: number) => {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

const pointDate = (point: DataPoint, field: string) => {
  const value = point[field] as {
    date?: { year?: number; month?: number; day?: number };
    interval?: { civilStartTime?: { date?: { year?: number; month?: number; day?: number } }; civilEndTime?: { date?: { year?: number; month?: number; day?: number } } };
  } | undefined;
  const date = value?.date ?? value?.interval?.civilStartTime?.date ?? value?.interval?.civilEndTime?.date;
  return date?.year && date.month && date.day ? `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}` : undefined;
};

const metric = (value: number | undefined, unit: string) => value === undefined
  ? { state: "no-data", unit }
  : { state: "available", value, unit };

const unavailable = (unit: string, note: string) => ({ state: "unavailable", unit, note });

const latest = <T,>(points: DataPoint[], key: string, valueKey: string): T | undefined => {
  const values = points.map((point) => point[key] as Record<string, unknown> | undefined).filter(Boolean);
  return values.length ? values[values.length - 1]?.[valueKey] as T : undefined;
};

export const today = async (env: HealthdashEnv) => {
  const token = await accessToken(env);
  const now = new Date();
  const date = civilDate(now);
  const weekAgo = shiftDate(date, -7);
  const tomorrow = shiftDate(date, 1);
  const dayFilter = (field: string) => `${field} >= "${weekAgo}" AND ${field} < "${tomorrow}"`;
  const query = (dataType: string, filter: string, pageSize?: string) => healthData(token, dataType, filter, pageSize).catch(() => null);
  const [stepsResult, restingResult, hrvResult, sleepResult] = await Promise.all([
    query("steps", dayFilter("steps.interval.civil_start_time")),
    query("daily-resting-heart-rate", dayFilter("daily_resting_heart_rate.date"), "100"),
    query("daily-heart-rate-variability", dayFilter("daily_heart_rate_variability.date"), "100"),
    query("sleep", `sleep.interval.civil_end_time >= "${weekAgo}" AND sleep.interval.civil_end_time < "${tomorrow}"`, "25"),
  ]);

  const stepsPoints = stepsResult ?? [];
  const dailySteps = stepsPoints.reduce((total, point) => {
    const steps = point.steps as { count?: string } | undefined;
    return pointDate(point, "steps") === date ? total + Number(steps?.count ?? 0) : total;
  }, 0);
  const recentSteps = stepsPoints.reduce<Record<string, number>>((days, point) => {
    const steps = point.steps as { count?: string } | undefined;
    const pointDay = pointDate(point, "steps");
    if (pointDay) days[pointDay] = (days[pointDay] ?? 0) + Number(steps?.count ?? 0);
    return days;
  }, {});
  const recentDates = Object.keys(recentSteps).sort().slice(-7);
  const baseline = recentDates.length ? recentDates.reduce((sum, day) => sum + recentSteps[day], 0) / recentDates.length : undefined;
  const resting = latest<string>(restingResult ?? [], "dailyRestingHeartRate", "beatsPerMinute");
  const hrv = latest<number>(hrvResult ?? [], "dailyHeartRateVariability", "averageHeartRateVariabilityMilliseconds");
  const sleepPoints = sleepResult ?? [];
  const sleep = sleepPoints.length ? sleepPoints[sleepPoints.length - 1].sleep as { summary?: { minutesAsleep?: string }; interval?: { startTime?: string; endTime?: string } } | undefined : undefined;
  const sleepHours = sleep?.summary?.minutesAsleep
    ? Number(sleep.summary.minutesAsleep) / 60
    : sleep?.interval?.startTime && sleep.interval.endTime
      ? (Date.parse(sleep.interval.endTime) - Date.parse(sleep.interval.startTime)) / 3_600_000
      : undefined;
  const steps = metric(dailySteps || undefined, "steps") as { state: string; value?: number; unit: string; baseline?: number };
  if (baseline !== undefined) steps.baseline = baseline;

  return {
    date,
    steps: stepsResult ? steps : unavailable("steps", "Google Health steps are unavailable."),
    restingHeartRate: restingResult ? metric(resting === undefined ? undefined : Number(resting), "bpm") : unavailable("bpm", "Google Health resting heart rate is unavailable."),
    hrv: hrvResult ? metric(hrv, "ms") : unavailable("ms", "Google Health HRV is unavailable."),
    sleep: sleepResult ? metric(sleepHours, "hours") : unavailable("hours", "Google Health sleep is unavailable."),
    activeZoneMinutes: unavailable("min", "Not fetched yet."),
    oxygenSaturation: unavailable("%", "Not fetched yet."),
    respiratoryRate: unavailable("brpm", "Not fetched yet."),
    trend: recentDates.map((day) => recentSteps[day]).filter((value) => Number.isFinite(value)),
    source: "google-health",
    syncedAt: new Date().toISOString(),
  };
};
