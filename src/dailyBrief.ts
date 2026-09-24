import type { HealthSnapshot, Metric } from "./domain";

export type BriefSignal = {
  key: "sleep" | "restingHeartRate" | "hrv" | "steps";
  label: string;
  value: number;
  unit: string;
  baseline?: number;
  delta?: number;
  partialDay?: boolean;
};

export type DailyBriefContext = {
  date: string;
  signals: BriefSignal[];
};

export type DailyBrief = {
  source: "local";
  text: string;
  signalsUsed: string[];
  note: string;
};

/** A replaceable boundary for a future opt-in remote interpretation provider. */
export interface DailyBriefProvider {
  create(context: DailyBriefContext): Promise<DailyBrief>;
}

const available = (key: BriefSignal["key"], label: string, metric: Metric<number>, partialDay = false): BriefSignal | undefined =>
  metric.state === "available" && metric.value !== undefined
    ? { key, label, value: metric.value, unit: metric.unit ?? "", baseline: metric.baseline, delta: metric.delta, partialDay }
    : undefined;

export const createDailyBriefContext = (snapshot: HealthSnapshot): DailyBriefContext => ({
  date: snapshot.date,
  signals: [
    available("sleep", "SLEEP", snapshot.sleep),
    available("restingHeartRate", "RESTING HR", snapshot.restingHeartRate),
    available("hrv", "HRV", snapshot.hrv),
    available("steps", "STEPS", snapshot.steps, true),
  ].filter((signal): signal is BriefSignal => signal !== undefined),
});

export const createLocalDailyBrief = (context: DailyBriefContext): DailyBrief => {
  const byKey = Object.fromEntries(context.signals.map((signal) => [signal.key, signal])) as Partial<Record<BriefSignal["key"], BriefSignal>>;
  const observations: string[] = [];
  const sleep = byKey.sleep;
  const resting = byKey.restingHeartRate;
  const hrv = byKey.hrv;
  const steps = byKey.steps;

  if (hrv?.delta !== undefined) observations.push(`HRV is ${hrv.delta >= 0 ? "above" : "below"} its usual range`);
  if (resting?.delta !== undefined) observations.push(`resting heart rate is ${resting.delta <= 0 ? "below" : "above"} its usual range`);
  if (sleep?.delta !== undefined) observations.push(`sleep duration is ${sleep.delta >= 0 ? "above" : "below"} your recent pattern`);
  if (steps) observations.push("activity is still in progress today");

  const baselineSignals = [hrv, resting, sleep].filter((signal) => signal?.delta !== undefined).length;
  const opening = baselineSignals >= 2 ? "Today’s available recovery signals are summarized against your personal baseline." : "This summary is limited to the signals currently available.";
  const text = observations.length ? `${opening} ${observations.join(". ")}.` : "No usable health signals were returned for today. Reconnect or sync again to update this local summary.";

  return {
    source: "local",
    text,
    signalsUsed: context.signals.map((signal) => signal.label),
    note: "Local derived summary · no health data sent to an AI provider",
  };
};
