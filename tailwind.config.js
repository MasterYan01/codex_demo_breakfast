/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./docs/**/*.{html,js}", "./backend/**/*.{html,js}"],
  darkMode: ["class", '[data-theme="dark"]'],
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        ink: "#352319",
        wood: "#8f5b3c",
        cream: "#fff8ef",
        latte: "#c79a78"
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', "serif"],
        sans: ['"Noto Sans TC"', "sans-serif"],
        display: ['"Cormorant Garamond"', "serif"]
      }
    }
  },
  plugins: []
};
