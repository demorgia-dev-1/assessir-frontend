import type { Config } from "tailwindcss";
import sharedConfig from "@repo/tailwind-config/shared";

const config: Config = {
  ...sharedConfig,
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ]
};

export default config;
