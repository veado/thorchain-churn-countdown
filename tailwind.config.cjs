const {
  "[data-theme=dark]": darkTheme,
  "[data-theme=light]": lightTheme,
} = require("daisyui/colors/themes");

const config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {},
  },

  plugins: [require("daisyui")],

  daisyui: {
    themes: [
      {
        dark: {
          ...darkTheme,
          primary: "#2fdcc7",
        },
        light: {
          ...lightTheme,
          primary: "#2fdcc7",
        },
      },
    ],
  },
};

module.exports = config;
