/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0f16",
          900: "#0d141d",
          850: "#111926",
          800: "#151f2c",
          700: "#1c2837",
        },
        brand: {
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        danger: {
          300: "#f0a4a4",
          400: "#e07a7a",
          500: "#c95c5c",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -12px rgba(52, 211, 153, 0.45)",
        "glow-rose": "0 0 40px -12px rgba(224, 122, 122, 0.4)",
        panel: "0 24px 80px -40px rgba(0, 0, 0, 0.75)",
        card: "0 1px 2px rgba(0, 0, 0, 0.35), 0 12px 32px -24px rgba(0, 0, 0, 0.8)",
      },
      keyframes: {
        "flow-x": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
        float: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(0,-22px,0) scale(1.04)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "flow-x": "flow-x 2.4s linear infinite",
        float: "float 16s ease-in-out infinite",
        shimmer: "shimmer 2.6s linear infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
      },
    },
  },
  plugins: [],
};
