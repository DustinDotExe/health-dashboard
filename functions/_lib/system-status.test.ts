import { describe, expect, it } from "vitest";
import { deriveSystemStatus } from "./system-status";

describe("deriveSystemStatus", () => {
  it("weights HRV, resting heart rate, and sleep against personal baselines", () => {
    const status = deriveSystemStatus({
      hrv: { value: 48, baseline: 44, unit: "ms" },
      restingHeartRate: { value: 57, baseline: 60, unit: "bpm" },
      sleep: { value: 7.2, baseline: 7.8, unit: "hours" },
    });

    expect(status).toMatchObject({ state: "available", score: 61 });
    expect(status.signals).toHaveLength(3);
  });

  it("does not produce a score without all three personal baselines", () => {
    const status = deriveSystemStatus({ hrv: { value: 48, baseline: 44 }, restingHeartRate: { value: 57, baseline: 60 }, sleep: { value: 7.2 } });

    expect(status).toMatchObject({ state: "insufficient-data" });
    expect(status.score).toBeUndefined();
  });
});
