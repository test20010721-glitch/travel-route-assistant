import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#0A84FF",
          light: "#E8F2FF",
          dark: "#0066CC",
        },
        surface: "#FFFFFF",
        subtle: "#F5F5F7",
        ink: {
          DEFAULT: "#1D1D1F",
          muted: "#6E6E73",
          faint: "#AEAEB2",
        },
        line: "#E5E5EA",
      },
      borderRadius: {
        card: "18px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
        floating: "0 4px 16px rgba(10,132,255,0.25)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
