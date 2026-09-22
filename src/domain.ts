export type MetricState = "available" | "no-data" | "unavailable";

export type Metric<T> = {
  state: MetricState;
  value?: T;
  unit?: string;
  baseline?: T;
  delta?: number;
  note?: string;
};

export type HealthSnapshot = {
  date: string;
  steps: Metric<number>;
  restingHeartRate: Metric<number>;
  hrv: Metric<number>;
  sleep: Metric<number>;
  activeZoneMinutes: Metric<number>;
  oxygenSaturation: Metric<number>;
  respiratoryRate: Metric<number>;
  trend: number[];
  source: "mock" | "google-health";
  syncedAt: string;
};

export interface HealthProvider {
  getToday(): Promise<HealthSnapshot>;
}

export const formatNumber = (value: number | undefined, digits = 0) =>
  value === undefined ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: digits });

export const metricDisplay = <T,>(metric: Metric<T>, formatter: (value: T) => string) => {
  if (metric.state === "unavailable") return "N/A";
  if (metric.state === "no-data" || metric.value === undefined) return "—";
  return formatter(metric.value);
};
