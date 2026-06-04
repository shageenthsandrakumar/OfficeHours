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
        ascend: {
          bg: "#F5F0E8",
          card: "#FDFAF4",
          sidebar: "#EDE8DC",
          primary: "#5C4A2A",
          "primary-dark": "#4A3A1E",
          secondary: "#8B7355",
          text: "#2C2416",
          muted: "#6B5C45",
          border: "#DDD5C0",
          success: "#4A6741",
          destructive: "#8B3A2A",
          "match-bg": "#EAE0CC",
          placeholder: "#A0917A",
          "card-hover": "#F5EFE2",
          chip: "#EDE8DC",
          "type-research-bg": "#E8EAD8",
          "type-research-text": "#4A5230",
          "type-internship-bg": "#E8DDD0",
          "type-internship-text": "#5C3D1E",
          "type-project-bg": "#D8E4E8",
          "type-project-text": "#1E3D4A",
        },
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "860px",
      },
    },
  },
  plugins: [],
};
export default config;
