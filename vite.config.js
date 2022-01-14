import { readFile } from "fs/promises";
import { resolve } from "path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

import { execSync } from "child_process";

// read package.json
const { version } = JSON.parse(
  await readFile(resolve("./package.json"), "utf-8")
);

// Add version no. hash to Vite's `env`
process.env.VITE_VERSION = version;
// Add commit hash to Vite's `env`
process.env.VITE_COMMIT_HASH = execSync(
  "git rev-parse --short HEAD"
).toString();

// https://vitejs.dev/config/
export default defineConfig({
  // https://vitejs.dev/config/#base
  base: "/thorchain-churn-countdown/",
  plugins: [svelte()],
  optimizeDeps: {
    include: ["svelte-hero-icons"],
  },
});
