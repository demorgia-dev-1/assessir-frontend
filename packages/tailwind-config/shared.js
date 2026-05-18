/** @type {import("tailwindcss").Config} */
const sharedConfig = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#bcdeff",
          300: "#8ac8ff",
          400: "#52a9ff",
          500: "#2c87f6",
          600: "#1769db",
          700: "#1554b1",
          800: "#18488f",
          900: "#1a3d75"
        }
      },
      boxShadow: {
        soft: "0 20px 45px -25px rgba(12, 32, 74, 0.35)"
      }
    }
  },
  plugins: []
};

module.exports = sharedConfig;
