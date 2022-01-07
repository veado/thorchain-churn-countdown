import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

import { execSync } from "child_process";

// parse and provide commit hash in Vite's `env`
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
