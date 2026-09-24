import { describe, expect, it } from "vitest";
import { civilDate } from "./google-health";

describe("civilDate", () => {
  it("uses the health account's civil day instead of the Cloudflare UTC day", () => {
    const afterUtcMidnight = new Date("2026-09-24T01:21:44.124Z");

    expect(civilDate(afterUtcMidnight)).toBe("2026-09-23");
  });

  it("accepts an explicit IANA time zone", () => {
    const instant = new Date("2026-09-24T01:21:44.124Z");

    expect(civilDate(instant, "America/Los_Angeles")).toBe("2026-09-23");
    expect(civilDate(instant, "Asia/Tokyo")).toBe("2026-09-24");
  });
});
