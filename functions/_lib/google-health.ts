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

const dailyRollup = async (token: string, dataType: string, startDate: string, endDate: string) => {
  const url = new URL(`https://health.googleapis.com/v4/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`);
  const dateParts = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return { date: { year, month, day }, time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } };
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      range: { start: dateParts(startDate), end: dateParts(endDate) },
      windowSizeDays: 1,
      dataSourceFamily: "users/me/dataSourceFamilies/all-sources",
    }),
  });
  if (!response.ok) throw new Error(`health-api-${response.status}`);
  return await response.json() as { rollupDataPoints?: DataPoint[] };
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

const offsetSeconds = (offset: string | undefined) => {
  const match = offset?.match(/^(-?\d+(?:\.\d+)?)s$/);
  return match ? Number(match[1]) : 0;
};

const sleepDate = (point: DataPoint) => {
  const interval = (point.sleep as { interval?: { endTime?: string; endUtcOffset?: string } } | undefined)?.interval;
  if (!interval?.endTime) return undefined;
  const localEnd = new Date(Date.parse(interval.endTime) + offsetSeconds(interval.endUtcOffset) * 1000);
  return Number.isNaN(localEnd.getTime()) ? undefined : localEnd.toISOString().slice(0, 10);
};

const metric = (value: number | undefined, unit: string) => value === undefined
  ? { state: "no-data", unit }
  : { state: "available", value, unit };

const unavailable = (unit: string, note: string) => ({ state: "unavailable", unit, note });

const series = (values: Record<string, number>, limit = 30) => Object.keys(values).sort().slice(-limit).map((date) => ({ date, value: values[date] }));

const dailyValues = (points: DataPoint[], key: string, valueKey: string) => points.reduce<Record<string, number>>((values, point) => {
  const date = pointDate(point, key);
  const raw = (point[key] as Record<string, unknown> | undefined)?.[valueKey];
  const value = typeof raw === "string" ? Number(raw) : raw;
  if (date && typeof value === "number" && Number.isFinite(value)) values[date] = value;
  return values;
}, {});

export const today = async (env: HealthdashEnv) => {
  const token = await accessToken(env);
  const now = new Date();
  const date = civilDate(now);
  const monthAgo = shiftDate(date, -30);
  const tomorrow = shiftDate(date, 1);
  const dayFilter = (field: string) => `${field} >= "${monthAgo}" AND ${field} < "${tomorrow}"`;
  const query = (dataType: string, filter: string, pageSize?: string) => healthData(token, dataType, filter, pageSize).catch(() => null);
  const [stepsResult, activeZoneResult, restingResult, hrvResult, oxygenResult, respiratoryResult, sleepResult] = await Promise.all([
    dailyRollup(token, "steps", monthAgo, tomorrow).catch(() => null),
    dailyRollup(token, "active-zone-minutes", monthAgo, tomorrow).catch(() => null),
    query("daily-resting-heart-rate", dayFilter("daily_resting_heart_rate.date"), "100"),
    query("daily-heart-rate-variability", dayFilter("daily_heart_rate_variability.date"), "100"),
    query("daily-oxygen-saturation", dayFilter("daily_oxygen_saturation.date"), "100"),
    query("daily-respiratory-rate", dayFilter("daily_respiratory_rate.date"), "100"),
    query("sleep", `sleep.interval.civil_end_time >= "${monthAgo}" AND sleep.interval.civil_end_time < "${tomorrow}"`, "100"),
  ]);

  const stepsPoints = stepsResult?.rollupDataPoints ?? [];
  const stepsByDay = stepsPoints.reduce<Record<string, number>>((days, point) => {
    const pointDay = pointDate(point, "civilStartTime");
    const count = Number((point.steps as { countSum?: string } | undefined)?.countSum ?? 0);
    if (pointDay && Number.isFinite(count)) days[pointDay] = count;
    return days;
  }, {});
  const todaySteps = stepsByDay[date];
  const activeZoneByDay = (activeZoneResult?.rollupDataPoints ?? []).reduce<Record<string, number>>((days, point) => {
    const pointDay = pointDate(point, "civilStartTime");
    const zones = point.activeZoneMinutes as { sumInCardioHeartZone?: string; sumInPeakHeartZone?: string; sumInFatBurnHeartZone?: string } | undefined;
    const value = Number(zones?.sumInCardioHeartZone ?? 0) + Number(zones?.sumInPeakHeartZone ?? 0) + Number(zones?.sumInFatBurnHeartZone ?? 0);
    if (pointDay && Number.isFinite(value)) days[pointDay] = value;
    return days;
  }, {});
  const todayActiveZoneMinutes = activeZoneByDay[date];
  const restingByDay = dailyValues(restingResult ?? [], "dailyRestingHeartRate", "beatsPerMinute");
  const hrvByDay = dailyValues(hrvResult ?? [], "dailyHeartRateVariability", "averageHeartRateVariabilityMilliseconds");
  const oxygenByDay = dailyValues(oxygenResult ?? [], "dailyOxygenSaturation", "averagePercentage");
  const respiratoryByDay = dailyValues(respiratoryResult ?? [], "dailyRespiratoryRate", "breathsPerMinute");
  const sleepPoints = sleepResult ?? [];
  const sleepByDay = sleepPoints.reduce<Record<string, number>>((values, point) => {
    const sleep = point.sleep as { summary?: { minutesAsleep?: string }; interval?: { startTime?: string; endTime?: string } } | undefined;
    const sleepHours = sleep?.summary?.minutesAsleep
      ? Number(sleep.summary.minutesAsleep) / 60
      : sleep?.interval?.startTime && sleep.interval.endTime
        ? (Date.parse(sleep.interval.endTime) - Date.parse(sleep.interval.startTime)) / 3_600_000
        : undefined;
    const pointDay = sleepDate(point);
    if (pointDay && sleepHours !== undefined && Number.isFinite(sleepHours)) values[pointDay] = (values[pointDay] ?? 0) + sleepHours;
    return values;
  }, {});
  const stepSeries = series(stepsByDay);
  const restingSeries = series(restingByDay);
  const hrvSeries = series(hrvByDay);
  const sleepSeries = series(sleepByDay);
  const recentSteps = stepSeries.slice(-7);
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
  const baseline = average(recentSteps.slice(0, -1).map((point) => point.value)) ?? average(recentSteps.map((point) => point.value));
  const resting = restingSeries.at(-1)?.value;
  const hrv = hrvSeries.at(-1)?.value;
  const oxygen = oxygenByDay[date] ?? series(oxygenByDay).at(-1)?.value;
  const respiratory = respiratoryByDay[date] ?? series(respiratoryByDay).at(-1)?.value;
  const sleepHours = sleepSeries.at(-1)?.value;
  const steps = metric(todaySteps ?? undefined, "steps") as { state: string; value?: number; unit: string; baseline?: number };
  if (baseline !== undefined) {
    steps.baseline = baseline;
    (steps as { delta?: number }).delta = steps.value === undefined ? undefined : steps.value - baseline;
  }
  const restingMetric = metric(resting, "bpm") as { state: string; value?: number; unit: string; baseline?: number; delta?: number };
  const hrvMetric = metric(hrv, "ms") as { state: string; value?: number; unit: string; baseline?: number; delta?: number };
  const sleepMetric = metric(sleepHours, "hours") as { state: string; value?: number; unit: string; baseline?: number; delta?: number };
  const addBaseline = (target: { value?: number; baseline?: number; delta?: number }, values: { value: number }[]) => {
    const value = average(values.slice(0, -1).map((point) => point.value)) ?? average(values.map((point) => point.value));
    if (value !== undefined) {
      target.baseline = value;
      target.delta = target.value === undefined ? undefined : target.value - value;
    }
  };
  addBaseline(restingMetric, restingSeries.slice(-7));
  addBaseline(hrvMetric, hrvSeries.slice(-7));
  addBaseline(sleepMetric, sleepSeries.slice(-7));

  return {
    date,
    steps: stepsResult ? steps : unavailable("steps", "Google Health steps are unavailable."),
    restingHeartRate: restingResult ? restingMetric : unavailable("bpm", "Google Health resting heart rate is unavailable."),
    hrv: hrvResult ? hrvMetric : unavailable("ms", "Google Health HRV is unavailable."),
    sleep: sleepResult ? sleepMetric : unavailable("hours", "Google Health sleep is unavailable."),
    activeZoneMinutes: activeZoneResult ? metric(todayActiveZoneMinutes, "min") : unavailable("min", "Google Health active zone minutes are unavailable."),
    oxygenSaturation: oxygenResult ? metric(oxygen, "%") : unavailable("%", "Google Health oxygen saturation is unavailable."),
    respiratoryRate: respiratoryResult ? metric(respiratory, "brpm") : unavailable("brpm", "Google Health respiratory rate is unavailable."),
    trends: {
      sevenDay: { steps: stepSeries.slice(-7), restingHeartRate: restingSeries.slice(-7), hrv: hrvSeries.slice(-7), sleep: sleepSeries.slice(-7) },
      thirtyDay: { steps: stepSeries, restingHeartRate: restingSeries, hrv: hrvSeries, sleep: sleepSeries },
    },
    source: "google-health",
    syncedAt: new Date().toISOString(),
  };
};
