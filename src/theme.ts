const fallback = {
  name: "fallback",
  background: "#101214",
  dark_background: "#0b0d0f",
  darker_background: "#080a0c",
  lighter_background: "#1c2226",
  foreground: "#e5e7eb",
  dark_foreground: "#8b949e",
  muted: "#69737d",
  accent: "#7dd3c7",
  green: "#a9d18e",
  yellow: "#e4b86a",
  red: "#e27d86",
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
