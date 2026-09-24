import type { HealthProvider, HealthSnapshot, TrendPoint } from "./domain";

const today = new Date();
const dateAt = (daysAgo: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};
const series = (values: number[]): TrendPoint[] => values.map((value, index) => ({ date: dateAt(values.length - index - 1), value }));

const sevenDay = {
  steps: series([7210, 8040, 6120, 7450, 6890, 7580, 6842]),
  restingHeartRate: series([61, 58, 60, 59, 62, 57, 57]),
  hrv: series([42, 45, 43, 47, 46, 49, 48]),
  sleep: series([7.6, 8.1, 6.9, 7.4, 7.8, 6.8, 7.2]),
};
const thirtyDay = {
  steps: [...series([6980, 7420, 6710, 8120, 7550, 7200, 6840, 7310, 7920, 7050, 7680, 6900, 8110, 7430, 6820, 7210, 8040, 6120, 7450, 6890, 7580, 6842])],
  restingHeartRate: [...series([62, 61, 60, 61, 59, 60, 58, 59, 60, 58, 57, 59, 61, 60, 58, 59, 62, 57, 58, 57, 57, 57])],
  hrv: [...series([39, 41, 42, 40, 43, 44, 42, 45, 43, 46, 44, 45, 43, 47, 46, 44, 42, 45, 43, 47, 46, 49, 48])],
  sleep: [...series([7.1, 7.4, 7.8, 6.8, 7.6, 8.1, 6.9, 7.4, 7.8, 6.8, 7.2, 7.5, 7.9, 7.0, 7.3, 7.7, 7.1, 7.6, 8.1, 6.9, 7.4, 7.8, 6.8, 7.2])],
};

export const mockSnapshot: HealthSnapshot = {
  date: today.toISOString().slice(0, 10),
  steps: { state: "available", value: 6842, unit: "steps", baseline: 7210, delta: -368 },
  restingHeartRate: { state: "available", value: 57, unit: "bpm", baseline: 60, delta: -3 },
  hrv: { state: "available", value: 48, unit: "ms", baseline: 44, delta: 4 },
  sleep: { state: "available", value: 7.2, unit: "hours", baseline: 7.8, delta: -0.6 },
  activeZoneMinutes: { state: "available", value: 32, unit: "min", baseline: 28, delta: 4 },
  oxygenSaturation: { state: "available", value: 97, unit: "%", baseline: 97, delta: 0 },
  respiratoryRate: { state: "available", value: 15.6, unit: "brpm", baseline: 15.4, delta: 0.2 },
  systemStatus: {
    state: "available",
    score: 61,
    note: "Derived from HRV, resting heart rate, and sleep against your personal baseline.",
    signals: [{ label: "HRV", unit: "ms", delta: 4 }, { label: "RHR", unit: "bpm", delta: -3 }, { label: "SLEEP", unit: "hours", delta: -0.6 }],
  },
  trends: { sevenDay, thirtyDay },
  source: "mock",
  syncedAt: new Date().toISOString(),
};

export class MockHealthProvider implements HealthProvider {
  async getToday() {
    await new Promise((resolve) => setTimeout(resolve, 180));
    return mockSnapshot;
  }
}
