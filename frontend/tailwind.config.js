export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom palette
        brand: {
          slate: "#0f172a",       // Deep slate for sidebar / header
          slateLight: "#1e293b",  // Hover state for sidebar items
          accent: "#10b981",      // Confident emerald accent
          accentHover: "#059669", // Accent hover state
          accentLight: "#ecfdf5", // Subtle highlight background
          bg: "#f8fafc",          // Main content off-white background
          card: "#ffffff",        // Solid opaque white card background
          border: "#e2e8f0",      // Light border color
          textMain: "#0f172a",    // Dark slate text
          textMuted: "#64748b",   // Slate-400 for subtext
          textLight: "#94a3b8",   // Light grey text
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
        card: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
      }
    },
  },
  plugins: [],
}
