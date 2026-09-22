import type { HealthProvider, HealthSnapshot } from "./domain";

const today = new Date();

export const mockSnapshot: HealthSnapshot = {
  date: today.toISOString().slice(0, 10),
  steps: { state: "available", value: 6842, unit: "steps", baseline: 7210, delta: -368 },
  restingHeartRate: { state: "available", value: 57, unit: "bpm", baseline: 60, delta: -3 },
  hrv: { state: "available", value: 48, unit: "ms", baseline: 44, delta: 4 },
  sleep: { state: "available", value: 7.2, unit: "hours", baseline: 7.8, delta: -0.6 },
  activeZoneMinutes: { state: "available", value: 32, unit: "min", baseline: 28, delta: 4 },
  oxygenSaturation: { state: "available", value: 97, unit: "%", baseline: 97, delta: 0 },
  respiratoryRate: { state: "available", value: 15.6, unit: "brpm", baseline: 15.4, delta: 0.2 },
  trend: [61, 58, 60, 59, 62, 57, 57],
  source: "mock",
  syncedAt: new Date().toISOString(),
};

export class MockHealthProvider implements HealthProvider {
  async getToday() {
    await new Promise((resolve) => setTimeout(resolve, 180));
    return mockSnapshot;
  }
}
