/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F7F2EC",
        foreground: "#3F2732",
        card: "#FFFDFB",
        border: "#E5D7D0",
        input: "#D8C8C0",
        ring: "#D4750A",
        primary: {
          DEFAULT: "#7A1030",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#D4750A",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1E8E2",
          foreground: "#6C5560",
        },
        accent: {
          DEFAULT: "#FBE8D0",
          foreground: "#7A1030",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
