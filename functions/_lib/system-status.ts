type BaselineMetric = { value?: number; baseline?: number; baselineDeviation?: number; unit?: string };

export type SystemStatus = {
  state: "available" | "insufficient-data";
  score?: number;
  note: string;
  signals: { label: string; unit: string; delta: number; componentScore: number; contribution: number }[];
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

type Component = { label: string; unit: string; delta: number; componentScore: number; contribution: number };

// This is deliberately an estimate, not an attempt to reproduce Fitbit's
// proprietary Readiness score. A normal personal baseline starts at 60 and
// each signal may move the estimate only within its documented range.
const componentFromBaseline = (
  label: string,
  metric: BaselineMetric,
  percentageAtMaximumEffect: number,
  maximumEffect: number,
  pointsPerStandardDeviation: number,
  direction: 1 | -1,
): Component | undefined => {
  if (metric.value === undefined || metric.baseline === undefined || metric.baseline <= 0) return undefined;
  const change = (metric.value - metric.baseline) / metric.baseline;
  const deviation = metric.value - metric.baseline;
  // A personal standard deviation is more meaningful than a fixed percentage:
  // normal day-to-day HRV or sleep variation should not be scored as a large
  // recovery penalty. The percentage scale remains only for short histories.
  const unboundedContribution = metric.baselineDeviation && metric.baselineDeviation > 0
    ? direction * (deviation / metric.baselineDeviation) * pointsPerStandardDeviation
    : direction * (change / percentageAtMaximumEffect) * maximumEffect;
  const contribution = clamp(unboundedContribution, -maximumEffect, maximumEffect);
  return {
    label,
    unit: metric.unit ?? "",
    delta: metric.value - metric.baseline,
    componentScore: Math.round(clamp(60 + contribution, 0, 100)),
    contribution: Math.round(contribution * 10) / 10,
  };
};

export const deriveSystemStatus = (metrics: {
  hrv: BaselineMetric;
  restingHeartRate: BaselineMetric;
  sleep: BaselineMetric;
}): SystemStatus => {
  const components = [
    // One normal standard deviation moves recovery only a few points; a single
    // noisy signal can never outweigh the rest of the day.
    componentFromBaseline("HRV", metrics.hrv, 0.25, 18, 3.5, 1),
    componentFromBaseline("RHR", metrics.restingHeartRate, 0.12, 15, 3, -1),
    componentFromBaseline("SLEEP", metrics.sleep, 0.2, 18, 4, 1),
  ];
  const signals = components.filter((component): component is Component => component !== undefined);

  if (signals.length !== 3)
    return { state: "insufficient-data", note: "Needs prior HRV, resting heart rate, and sleep readings to establish baselines.", signals };

  return {
    state: "available",
    score: Math.round(clamp(60 + signals.reduce((total, signal) => total + signal.contribution, 0), 0, 100)),
    note: "Derived recovery estimate from up to 28 days of HRV, resting heart rate, and sleep history, adjusted for your normal variation. Not Google Readiness.",
    signals,
  };
};
