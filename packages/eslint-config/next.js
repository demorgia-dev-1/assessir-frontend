module.exports = [
  {
    ignores: [".next/**", "out/**", "dist/**", "coverage/**"]
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        projectService: true,
        tsconfigRootDir: process.cwd()
      }
    }
  },
  require("@next/eslint-plugin-next").flatConfig.recommended,
  require("@next/eslint-plugin-next").flatConfig.coreWebVitals
];
