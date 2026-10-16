import type { Config } from "tailwindcss";

const c = (n: string) => `var(--c-${n})`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("bg"), canvas: c("bg-canvas"), surface: c("surface"), border: c("border"),
        "border-input": c("border-input"), text: c("text"), muted: c("text-muted"),
        accent: c("accent"), "accent-hover": c("accent-hover"), "on-accent": c("on-accent"),
        danger: c("danger"), success: c("success"), warning: c("warning"),
        "sev-critical": c("sev-critical"), "sev-critical-bg": c("sev-critical-bg"),
        "sev-high": c("sev-high"), "sev-high-bg": c("sev-high-bg"),
        "sev-medium": c("sev-medium"), "sev-medium-bg": c("sev-medium-bg"),
        "sev-low": c("sev-low"), "sev-low-bg": c("sev-low-bg"),
      },
      fontFamily: { sans: ["var(--font-sans)"], mono: ["var(--font-mono)"] },
      fontSize: {
        xs: ["12px", { lineHeight: "16px", fontWeight: "500" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        xl: ["28px", { lineHeight: "34px", fontWeight: "650" }],
        "2xl": ["40px", { lineHeight: "44px", fontWeight: "650" }],
        display: ["64px", { lineHeight: "66px", fontWeight: "700", letterSpacing: "-0.02em" }],
      },
      borderRadius: { sm: "var(--r-sm)", md: "var(--r-md)", lg: "var(--r-lg)" },
      boxShadow: { card: "var(--shadow-card)", pop: "var(--shadow-pop)" },
      maxWidth: { content: "var(--content-max)", app: "var(--app-max)" },
      transitionTimingFunction: { out: "var(--motion-ease)" },
    },
  },
  plugins: [],
} satisfies Config;
