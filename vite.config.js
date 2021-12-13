import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  // https://vitejs.dev/config/#base
  base: "/thorchain-churn-countdown/",
  plugins: [svelte()],
  optimizeDeps: {
    include: ["svelte-hero-icons"],
  },
});
