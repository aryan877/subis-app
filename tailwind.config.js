/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: [
      {
        lofi: {
          ...require("daisyui/src/theming/themes")["lofi"],
          ".btn-primary": {
            "background-color": "#BEFF6B",
            color: "#000",
            "border-color": "#000",
          },
          ".btn-primary:hover": {
            "background-color": "#A6FF4D",
            color: "#000",
            "border-color": "#000",
          },
          ".btn-primary:active": {
            "background-color": "#A6FF4D",
            color: "#000",
            "border-color": "#000",
          },
          ".btn-secondary": {
            "background-color": "#FFD88C",
            color: "#000",
            "border-color": "#000",
          },
          ".btn-secondary:hover": {
            "background-color": "#FFCC66",
            color: "#000",
            "border-color": "#000",
          },
          ".btn-secondary:active": {
            "background-color": "#FFCC66",
            color: "#000",
            "border-color": "#000",
          },
          ".btn-accent": {
            "background-color": "#FF9A8C",
            color: "#000",
            "border-color": "#000",
          },
          ".btn-accent:hover": {
            "background-color": "#FF7F66",
            color: "#000",
            "border-color": "#000",
          },
          ".btn-accent:active": {
            "background-color": "#FF7F66",
            color: "#000",
            "border-color": "#000",
          },
        },
      },
    ],
  },
  plugins: [require("daisyui")],
};
