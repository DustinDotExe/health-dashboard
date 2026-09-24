export type Theme = {
  id: string;
  label: string;
  colors: Record<string, string>;
};

const names: Record<string, string> = {
  "catppuccin-latte": "Catppuccin Latte",
  "catppuccin": "Catppuccin",
  "ethereal": "Ethereal",
  "everforest": "Everforest",
  "flexoki-light": "Flexoki Light",
  "gruvbox": "Gruvbox",
  "hackerman": "Hackerman",
  "kanagawa": "Kanagawa",
  "last-horizon": "Last Horizon",
  "lumon": "Lumon",
  "lupine": "Lupine",
  "matte-black": "Matte Black",
  "miasma": "Miasma",
  "nord": "Nord",
  "osaka-jade": "Osaka Jade",
  "retro-82": "Retro 82",
  "ristretto": "Ristretto",
  "rose-pine": "Rose Pine",
  "solitude": "Solitude",
  "tokyo-night": "Tokyo Night",
  "vantablack": "Vantablack",
  "white": "White",
  "aether": "Aether",
  "ghibli": "Ghibli",
  "vaporwave": "Vaporwave",
};

const palette = (id: string, values: string): Theme => {
  const [accent, mutedStrong, background, backgroundDeep, backgroundDark, surface, foreground, muted, critical, warning, positive] = values.split(" ");
  return { id, label: names[id], colors: { background, backgroundDeep, backgroundDark, surface, foreground, muted, mutedStrong, accent, positive, warning, critical } };
};

export const themes: Theme[] = [
  { id: "neutral", label: "Neutral", colors: { background: "#1a1a1a", backgroundDeep: "#0b0b0b", backgroundDark: "#000000", surface: "#242424", foreground: "#f5f5f5", muted: "#a3a3a3", mutedStrong: "#737373", accent: "#f5f5f5", positive: "#d4d4d4", warning: "#a3a3a3", critical: "#737373" } },
  palette("aether", "#f38d70 #72696a #2c2525 #211b1b #181414 #3d2f2a #e6d9db #72696a #fd6883 #f9cc6c #adda78"),
  palette("catppuccin", "#89b4fa #585b70 #1e1e2e #161622 #101019 #313244 #cdd6f4 #6c7086 #f38ba8 #f9e2af #a6e3a1"),
  palette("catppuccin-latte", "#1e66f5 #acb0be #eff1f5 #e3e4e8 #d7d8dc #dce0e8 #4c4f69 #9ca0b0 #d20f39 #df8e1d #40a02b"),
  palette("ethereal", "#7d82d9 #6d7db6 #060B1E #040816 #030610 #131a3a #ffcead #6d7db6 #ED5B5A #E9BB4F #92a593"),
  palette("everforest", "#7fbbb3 #475258 #2d353b #21272c #181d20 #343f44 #d3c6aa #4f585e #e67e80 #dbbc7f #a7c080"),
  palette("flexoki-light", "#205EA6 #B7B5AC #FFFCF0 #f2efe4 #e5e2d8 #E6E4D9 #100F0F #878580 #D14D41 #D0A215 #879A39"),
  palette("ghibli", "#98a6bb #636762 #090f08 #070b06 #050804 #222721 #c6cfb6 #959b89 #718152 #90957d #6c8266"),
  palette("gruvbox", "#7daea3 #665c54 #282828 #1e1e1e #161616 #3c3836 #d4be98 #7c6f64 #ea6962 #d8a657 #a9b665"),
  palette("hackerman", "#82FB9C #2d3450 #0B0C16 #080910 #06060c #151828 #ddf7ff #6a6e95 #50f872 #50f7d4 #4fe88f"),
  palette("kanagawa", "#dcd7ba #54546D #1f1f28 #17171e #111116 #223249 #dcd7ba #727169 #c34043 #c0a36e #76946a"),
  palette("last-horizon", "#b59790 #584e51 #0c0b0c #090809 #060606 #0c0b0c #FAFCFB #584e51 #c38b7b #6B5E73 #87a9b0"),
  palette("lumon", "#8bc9eb #304860 #16242d #101b21 #0b1216 #1b2d40 #d6e2ee #4d86b0 #4d86b0 #6fa4c9 #5e95bc"),
  palette("lupine", "#3264eb #9e9e9e #fafafa #ececec #dedede #f5f5f5 #212121 #757575 #c900c4 #026fde #4a2fd0"),
  palette("matte-black", "#e68e0d #333333 #121212 #0d0d0d #090909 #1e1e1e #bebebe #555555 #D35F5F #b91c1c #FFC107"),
  palette("miasma", "#78824b #666666 #222222 #191919 #121212 #2c2c2c #c2c2b0 #555555 #685742 #b36d43 #5f875f"),
  palette("nord", "#81a1c1 #4c566a #2e3440 #222730 #191c23 #3b4252 #d8dee9 #667080 #bf616a #ebcb8b #a3be8c"),
  palette("osaka-jade", "#509475 #53685B #111c18 #0c1512 #090f0d #23372B #C1C497 #81B8A8 #FF5345 #459451 #549e6a"),
  palette("retro-82", "#faa968 #2a6b78 #05182e #031222 #020c17 #0a2540 #f6dcac #3f8f8a #f85525 #e97b3c #028391"),
  palette("ristretto", "#f38d70 #72696a #2c2525 #211b1b #181414 #3d2f2a #e6d9db #72696a #fd6883 #f9cc6c #adda78"),
  palette("rose-pine", "#56949f #cecacd #faf4ed #ede7e1 #e1dbd5 #f2e9e1 #575279 #9893a5 #b4637a #ea9d34 #286983"),
  palette("solitude", "#798186 #4b4e55 #101315 #0c0e10 #080a0b #101315 #cacccc #4b4e55 #565d60 #d9dbdc #9fa5a9"),
  palette("tokyo-night", "#7aa2f7 #414868 #1a1b26 #13141c #0e0e14 #24283b #a9b1d6 #565f89 #f7768e #e0af68 #9ece6a"),
  palette("vantablack", "#8d8d8d #7a7a7a #000000 #090909 #070707 #1a1a1a #ffffff #505050 #a4a4a4 #cecece #b6b6b6"),
  palette("vaporwave", "#9bacde #5d6565 #09191a #071314 #050d0d #223031 #e7c5bf #ad948f #d69899 #cacaa5 #89cebc"),
  palette("white", "#6e6e6e #808080 #ffffff #f5f5f5 #e8e8e8 #c0c0c0 #000000 #c0c0c0 #2a2a2a #4a4a4a #3a3a3a"),
];

export const defaultThemeId = "neutral";
const storageKey = "healthdash-theme";

export const savedThemeId = () => {
  try {
    const id = localStorage.getItem(storageKey);
    return themes.some((theme) => theme.id === id) ? id! : defaultThemeId;
  } catch {
    return defaultThemeId;
  }
};

export const applyTheme = (id: string) => {
  const theme = themes.find((candidate) => candidate.id === id) ?? themes[0];
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([name, value]) => root.style.setProperty(`--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value));
  try { localStorage.setItem(storageKey, theme.id); } catch { /* The visual preference remains active for this page. */ }
};
