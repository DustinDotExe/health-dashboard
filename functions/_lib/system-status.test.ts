import { describe, expect, it } from "vitest";
import { deriveSystemStatus } from "./system-status";

describe("deriveSystemStatus", () => {
  it("uses capped, transparent contributions against personal baselines", () => {
    const status = deriveSystemStatus({
      hrv: { value: 48, baseline: 44, unit: "ms" },
      restingHeartRate: { value: 57, baseline: 60, unit: "bpm" },
      sleep: { value: 7.2, baseline: 7.8, unit: "hours" },
    });

    expect(status).toMatchObject({ state: "available", score: 66 });
    expect(status.signals).toHaveLength(3);
    expect(status.signals).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "HRV", contribution: 6.5 }),
      expect.objectContaining({ label: "RHR", contribution: 6.3 }),
      expect.objectContaining({ label: "SLEEP", contribution: -6.9 }),
    ]));
  });

  it("caps an outlying signal so one reading cannot dominate the estimate", () => {
    const status = deriveSystemStatus({
      hrv: { value: 10, baseline: 50 },
      restingHeartRate: { value: 90, baseline: 60 },
      sleep: { value: 2, baseline: 8 },
    });

    expect(status).toMatchObject({ state: "available", score: 9 });
    expect(status.signals.map((signal) => signal.contribution)).toEqual([-18, -15, -18]);
  });

  it("does not produce a score without all three personal baselines", () => {
    const status = deriveSystemStatus({ hrv: { value: 48, baseline: 44 }, restingHeartRate: { value: 57, baseline: 60 }, sleep: { value: 7.2 } });

    expect(status).toMatchObject({ state: "insufficient-data" });
    expect(status.score).toBeUndefined();
  });
});
