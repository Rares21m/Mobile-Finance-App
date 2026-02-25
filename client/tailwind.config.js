/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: "#10B981",
                "primary-light": "#34D399",
                "primary-dark": "#059669",
                accent: "#6366F1",
                "accent-light": "#818CF8",
                secondary: "#F8729C",
                dark: {
                    bg: "#0C0C14",
                    surface: "#161621",
                    card: "#1C1C2A",
                    border: "#2A2A3C",
                },
                muted: "#6B7280",
                success: "#22C55E",
                expense: "#F43F5E",
                warning: "#F59E0B",
            },
        },
    },
    plugins: [],
};
