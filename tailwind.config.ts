import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101820",
        gold: "#C8A45D",
        ember: "#E66A3C",
        mist: "#F4F7F5"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(16, 24, 32, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
