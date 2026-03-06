/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "cs-dark": "#0a0e17",
        "cs-panel": "#111827",
        "cs-border": "#1f2937",
        "cs-accent": "#ef4444",
        "cs-accent-2": "#f97316",
        "cs-accent-3": "#eab308",
        "cs-blue": "#3b82f6",
        "cs-green": "#22c55e",
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
