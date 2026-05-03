export const theme = {
  colors: {
    primary: "210 35% 25%",
    primaryForeground: "0 0% 98%",
    secondary: "210 20% 96%",
    secondaryForeground: "210 35% 20%",
    accent: "30 60% 55%",
    accentForeground: "0 0% 98%",
    background: "0 0% 99%",
    foreground: "210 20% 15%",
    muted: "210 15% 96%",
    mutedForeground: "210 15% 50%",
    border: "210 15% 88%",
    destructive: "0 72% 51%",
  },
  typography: {
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Plus Jakarta Sans', system-ui, sans-serif",
    scaleBase: "16px",
  },
  radius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "1rem",
    xl: "1.5rem",
    "2xl": "2rem",
    full: "9999px",
  },
  spacing: {
    containerMax: "1280px",
    sectionPadding: "6rem",
  },
  animation: {
    durationFast: "150ms",
    durationBase: "300ms",
    durationSlow: "700ms",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

export type Theme = typeof theme;
