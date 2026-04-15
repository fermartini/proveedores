/** @type {import('tailwindcss').Config} */
export default {
  // Escanear todos los archivos JSX/JS del proyecto para tree-shaking de clases
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Paleta de colores primaria — azul cobalto oscuro, estilo SaaS premium
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        surface: {
          DEFAULT: "#0f172a",   // Fondo principal (slate-900)
          card:    "#1e293b",   // Fondo de cards (slate-800)
          border:  "#334155",   // Bordes (slate-700)
          muted:   "#475569",   // Texto secundario (slate-600)
        },
      },
      // Tipografía
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace"],
      },
      // Glassmorphism utility
      backdropBlur: {
        xs: "2px",
      },
      // Animaciones personalizadas
      animation: {
        "fade-in":     "fadeIn 0.3s ease-out",
        "slide-up":    "slideUp 0.4s ease-out",
        "pulse-slow":  "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer":     "shimmer 2s infinite linear",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
}
