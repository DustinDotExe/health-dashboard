import { describe, expect, it } from "vitest";
import { defaultThemeId, themes } from "./theme";

describe("web themes", () => {
  it("includes the neutral default and every locally available Omarchy preset", () => {
    expect(defaultThemeId).toBe("neutral");
    expect(themes).toHaveLength(26);
    expect(themes.map((theme) => theme.id)).toEqual(expect.arrayContaining(["aether", "catppuccin", "everforest", "ghibli", "tokyo-night", "vaporwave", "white"]));
  });
});
