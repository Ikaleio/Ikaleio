// Values come from app/app.css in Ikaleio/ikaleio-homepage. The contribution levels mix
// `primary` with GitHub's page background at 30%, 55%, 80%, and 100%.
export const theme = {
  light: {
    background: "#fafafa",
    foreground: "#18181b",
    mutedForeground: "#71717a",
    border: "#e4e4e7",
    primary: "#6467f2",
    contributionEmpty: "#e4e4e7",
    contributionLevels: ["#d1d1fb", "#aaabf8", "#8385f5", "#6467f2"],
  },
  dark: {
    background: "#0a0a0b",
    foreground: "#fafafa",
    mutedForeground: "#a1a1aa",
    border: "#27272a",
    primary: "#6467f2",
    contributionEmpty: "#27272a",
    contributionLevels: ["#272b59", "#3d408f", "#5356c6", "#6467f2"],
  },
};

export type Mode = keyof typeof theme;
