type BaselineMetric = { value?: number; baseline?: number; unit?: string };

export type SystemStatus = {
  state: "available" | "insufficient-data";
  score?: number;
  note: string;
  signals: { label: string; unit: string; delta: number }[];
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

const scoreFromBaseline = (metric: BaselineMetric, scale: number, direction: 1 | -1) => {
  if (metric.value === undefined || metric.baseline === undefined || metric.baseline <= 0) return undefined;
  const change = (metric.value - metric.baseline) / metric.baseline;
  return clamp(50 + direction * (change / scale) * 50, 0, 100);
};

export const deriveSystemStatus = (metrics: {
  hrv: BaselineMetric;
  restingHeartRate: BaselineMetric;
  sleep: BaselineMetric;
}): SystemStatus => {
  const hrvScore = scoreFromBaseline(metrics.hrv, 0.2, 1);
  const restingScore = scoreFromBaseline(metrics.restingHeartRate, 0.12, -1);
  const sleepScore = scoreFromBaseline(metrics.sleep, 0.25, 1);
  const signals = [
    { label: "HRV", unit: metrics.hrv.unit ?? "ms", delta: metrics.hrv.value === undefined || metrics.hrv.baseline === undefined ? undefined : metrics.hrv.value - metrics.hrv.baseline },
    { label: "RHR", unit: metrics.restingHeartRate.unit ?? "bpm", delta: metrics.restingHeartRate.value === undefined || metrics.restingHeartRate.baseline === undefined ? undefined : metrics.restingHeartRate.value - metrics.restingHeartRate.baseline },
    { label: "SLEEP", unit: metrics.sleep.unit ?? "hours", delta: metrics.sleep.value === undefined || metrics.sleep.baseline === undefined ? undefined : metrics.sleep.value - metrics.sleep.baseline },
  ].filter((signal): signal is { label: string; unit: string; delta: number } => signal.delta !== undefined);

  if (hrvScore === undefined || restingScore === undefined || sleepScore === undefined)
    return { state: "insufficient-data", note: "Needs HRV, resting heart rate, and sleep baselines.", signals };

  return {
    state: "available",
    score: Math.round(hrvScore * 0.4 + restingScore * 0.3 + sleepScore * 0.3),
    note: "Derived from HRV, resting heart rate, and sleep against your personal baseline.",
    signals,
  };
};
