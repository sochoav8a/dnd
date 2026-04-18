import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: "#fdf8f0",
          100: "#f9efd8",
          200: "#f2ddb0",
          300: "#e8c57e",
          400: "#dda84a",
          500: "#c8902a",
          600: "#a87020",
          700: "#85541a",
          800: "#6b431a",
          900: "#59371a",
        },
        ink: {
          50: "#f1f0ff",
          100: "#e5e3ff",
          200: "#ccc7ff",
          300: "#a69dff",
          400: "#7d70ff",
          500: "#5b4eea",
          600: "#4538c8",
          700: "#3729a3",
          800: "#2c2381",
          900: "#231e63",
        },
        dragon: {
          red: "#8b1a1a",
          gold: "#c8a000",
          dark: "#1a0a00",
        },
        hp: {
          full: "#34d399",
          healthy: "#84cc16",
          wounded: "#eab308",
          bloodied: "#f97316",
          critical: "#ef4444",
          down: "#52525b",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Cinzel", "serif"],
        serif: ["var(--font-serif)", "Crimson Text", "serif"],
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        medieval: ["var(--font-display)", "Cinzel", "serif"],
        body: ["var(--font-serif)", "Crimson Text", "serif"],
      },
      backgroundImage: {
        "parchment-texture": "url('/textures/parchment.jpg')",
        "ambient-glow":
          "radial-gradient(ellipse at top, rgba(200, 144, 42, 0.08), transparent 55%), radial-gradient(ellipse at bottom, rgba(139, 26, 26, 0.05), transparent 55%)",
        "card-sheen":
          "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.15) 100%)",
      },
      boxShadow: {
        elevated:
          "0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px -8px rgba(0, 0, 0, 0.6)",
        scroll:
          "0 0 0 1px rgba(232, 197, 126, 0.08), 0 12px 32px -12px rgba(0, 0, 0, 0.8)",
        inset:
          "inset 0 1px 0 rgba(255, 255, 255, 0.04), inset 0 -1px 0 rgba(0, 0, 0, 0.3)",
        glow: "0 0 24px rgba(221, 168, 74, 0.18)",
      },
      dropShadow: {
        glow: "0 0 8px rgba(221, 168, 74, 0.35)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "pulse-soft": "pulse-soft 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  safelist: [
    "bg-hp-full", "bg-hp-healthy", "bg-hp-wounded", "bg-hp-bloodied", "bg-hp-critical", "bg-hp-down",
    "text-hp-full", "text-hp-healthy", "text-hp-wounded", "text-hp-bloodied", "text-hp-critical", "text-hp-down",
    "border-hp-full", "border-hp-healthy", "border-hp-wounded", "border-hp-bloodied", "border-hp-critical", "border-hp-down",
  ],
  plugins: [],
};

export default config;
