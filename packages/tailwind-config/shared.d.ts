import type { Config } from "tailwindcss";

declare const sharedConfig: Omit<Config, "content">;

export = sharedConfig;
