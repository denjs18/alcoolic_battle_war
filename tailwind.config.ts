import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          deep: "#0a1628",
          mid: "#0d2240",
          light: "#1a3a5c",
          surface: "#1e4976",
        },
        shot: "#f59e0b",
      },
    },
  },
  plugins: [],
};

export default config;
