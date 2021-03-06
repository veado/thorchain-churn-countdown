const {
  "[data-theme=dark]": darkTheme,
  "[data-theme=light]": lightTheme,
} = require("daisyui/src/colors/themes");

const config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {},
  },

  plugins: [require("daisyui")],

  daisyui: {
    // How to customize an existing theme?
    // https://daisyui.com/docs/themes/
    themes: [
      {
        dark: {
          ...darkTheme,
          primary: "#2fdcc7",
          "--b1": "219 14% 28%",
          "--bc": "228 14% 93%",
          "--nc": "228 14% 93%",
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
