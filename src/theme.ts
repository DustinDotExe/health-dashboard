const fallback = {
  name: "everforest",
  background: "#2d353b",
  dark_background: "#21272c",
  darker_background: "#181d20",
  lighter_background: "#343f44",
  foreground: "#d3c6aa",
  dark_foreground: "#4f585e",
  muted: "#475258",
  accent: "#7fbbb3",
  green: "#a7c080",
  yellow: "#dbbc7f",
  red: "#e67e80",
};

const parseColors = (text: string) =>
  Object.fromEntries(
    text.split("\n").flatMap((line) => {
      const match = line.match(/^([a-z_]+)\s*=\s*"(#[0-9a-fA-F]{6})"/);
      return match ? [[match[1], match[2]]] : [];
    }),
  );

export const loadTheme = async () => {
  try {
    const response = await fetch("/api/theme");
    if (!response.ok) throw new Error("theme unavailable");
    const payload = (await response.json()) as { name: string; colors: string };
    return { ...fallback, ...parseColors(payload.colors), name: payload.name };
  } catch {
    return fallback;
  }
};

export const applyTheme = (theme: Record<string, string>) => {
  const root = document.documentElement;
  const mappings: Record<string, string> = {
    background: "--background",
    dark_background: "--background-deep",
    darker_background: "--background-dark",
    lighter_background: "--surface",
    foreground: "--foreground",
    dark_foreground: "--muted",
    muted: "--muted-strong",
    accent: "--accent",
    green: "--positive",
    yellow: "--warning",
    red: "--critical",
  };
  Object.entries(mappings).forEach(([source, variable]) => root.style.setProperty(variable, theme[source]));
};
