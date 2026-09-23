import { describe, expect, it } from "vitest";
import { formatNumber, metricDisplay, metricStatus, type Metric } from "./domain";

describe("metric display", () => {
  it("distinguishes missing and unavailable values", () => {
    const missing: Metric<number> = { state: "no-data" };
    const unavailable: Metric<number> = { state: "unavailable" };
    expect(metricDisplay(missing, formatNumber)).toBe("—");
    expect(metricDisplay(unavailable, formatNumber)).toBe("N/A");
  });

  it("formats available values", () => {
    expect(metricDisplay({ state: "available", value: 6842 }, formatNumber)).toBe("6,842");
  });

  it("labels metric availability without implying a value", () => {
    expect(metricStatus({ state: "available", value: 1 })).toBe("LIVE");
    expect(metricStatus({ state: "no-data" })).toBe("NO DATA");
    expect(metricStatus({ state: "unavailable" })).toBe("UNAVAILABLE");
  });
});
