import { describe, expect, it } from "vitest";
import { createDailyBriefContext, createLocalDailyBrief } from "./dailyBrief";
import { mockSnapshot } from "./mockProvider";

describe("daily brief", () => {
  it("uses only available, derived snapshot signals", () => {
    const context = createDailyBriefContext(mockSnapshot);
    expect(context.signals.map((signal) => signal.key)).toEqual(["sleep", "restingHeartRate", "hrv", "steps"]);
    expect(context.signals[0]).toMatchObject({ value: 7.2, baseline: 7.8, delta: -0.6 });
  });

  it("writes a concise local summary without diagnoses", () => {
    const brief = createLocalDailyBrief(createDailyBriefContext(mockSnapshot));
    expect(brief.source).toBe("local");
    expect(brief.text).toContain("HRV is above its usual range");
    expect(brief.text).toContain("resting heart rate is below its usual range");
    expect(brief.text).not.toMatch(/diagnos|disease|condition/i);
  });

  it("omits unavailable metrics rather than fabricating a value", () => {
    const snapshot = structuredClone(mockSnapshot);
    snapshot.hrv = { state: "unavailable", unit: "ms" };
    const brief = createLocalDailyBrief(createDailyBriefContext(snapshot));
    expect(brief.signalsUsed).not.toContain("HRV");
    expect(brief.text).not.toContain("HRV is");
  });
});
