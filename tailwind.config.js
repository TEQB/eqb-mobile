/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#DC2626",
          light: "#FCA5A5",
          dark: "#991B1B",
        },
        secondary: {
          DEFAULT: "#F59E0B",
          light: "#FDE68A",
          dark: "#B45309",
        },
        muted: {
          DEFAULT: "#6B7280",
          light: "#9CA3AF",
          dark: "#4B5563",
        },
        accent: {
          DEFAULT: "#3B82F6",
          light: "#93C5FD",
          dark: "#1D4ED8",
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
      },
    },
  },
  plugins: [],
};
