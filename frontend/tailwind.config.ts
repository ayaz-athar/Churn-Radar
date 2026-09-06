import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#FF0052",
          yellow: "#FFD400",
          green: "#00C68D",
          blue: "#0055DA",
        },
        cream: {
          50: "#FAF9F5",
          100: "#F6F4ED",
          200: "#EFECE1",
          300: "#E3DFD2",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F7F6F1",
          border: "#E9E5DC",
          borderDark: "#DCD7CB",
        },
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -2px rgba(0,0,0,0.03)",
        card: "0 2px 10px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
      }
    },
  },
  plugins: [],
};
export default config;