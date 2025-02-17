/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx}"],
    theme: {
      extend: {},
    },
    plugins: [],
    corePlugins: {
      preflight: false, // Disable Tailwind's reset to avoid conflicts with antd
    }
  }
  