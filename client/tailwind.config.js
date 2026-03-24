
module.exports = {
  darkMode: "class",
  content: [
  "./app/**/*.{js,jsx,ts,tsx}",
  "./components/**/*.{js,jsx,ts,tsx}"],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
        card: "var(--color-card)",
        border: "var(--color-border)",
        foreground: "var(--color-foreground)",
        "text-muted": "var(--color-text-muted)",
        "text-inverse": "var(--color-text-inverse)",
        primary: "var(--color-primary)",
        "primary-light": "var(--color-primary-light)",
        "primary-dark": "var(--color-primary-dark)",
        accent: "var(--color-accent)",
        "accent-light": "var(--color-accent-light)",
        expense: "var(--color-expense)",
        success: "var(--color-success)",

        secondary: "#F8729C",
        warning: "#F59E0B"
      }
    }
  },
  plugins: []
};