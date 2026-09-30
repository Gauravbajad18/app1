/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../shared/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#0F172A"
        },
        navy: {
          800: "#1E293B",
          900: "#0F172A",
          950: "#0A0F1D"
        },
        severity: {
          low: {
            bg: "#F0FDF4",
            text: "#166534",
            border: "#BBF7D0",
            badge: "#22C55E"
          },
          medium: {
            bg: "#FEFCE8",
            text: "#854D0E",
            border: "#FEF08A",
            badge: "#EAB308"
          },
          high: {
            bg: "#FFF7ED",
            text: "#9A3412",
            border: "#FED7AA",
            badge: "#F97316"
          },
          critical: {
            bg: "#FEF2F2",
            text: "#991B1B",
            border: "#FECACA",
            badge: "#EF4444"
          }
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"]
      }
    }
  },
  plugins: []
};
