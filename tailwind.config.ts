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
        // Côté Mas brand palette — warm Provençal tones
        "cm-gold": "#C4933F",
        "cm-gold-light": "#E8C47A",
        "cm-rose": "#C8687A",
        "cm-rose-light": "#E8A0AE",
        "cm-blue": "#3A6B8C",
        "cm-blue-light": "#7AAFC8",
        "cm-green": "#5B7A4E",
        "cm-cream": "#FAF6EF",
        "cm-cream-dark": "#F0E8D8",
        "cm-charcoal": "#2C2820",
        "cm-stone": "#8C7B6A",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["system-ui", "-apple-system", "sans-serif"],
      },
      backgroundImage: {
        "gradient-provencal":
          "linear-gradient(135deg, #FAF6EF 0%, #F0E8D8 50%, #E8DCC8 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
