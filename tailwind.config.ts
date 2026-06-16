import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: "#d4af37",
        "gold-soft": "#f4de8a",
        "bg-main": "#070707",
        "bg-panel": "#121212",
        "text-main": "#f4f1e8",
        "text-muted": "#a7a39a",
        "border-soft": "rgba(212, 175, 55, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
