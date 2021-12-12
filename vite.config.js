import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  optimizeDeps: {
    include: ["svelte-hero-icons"],
  },
})


// const config = {
//   // other vite-plugin-svelte config
//   kit: {
//     // other svelte-kit config
//     vite: {
//       // other vite config
//       optimizeDeps: {
//         include: ["svelte-hero-icons"],
//       },
//     },
//   },
// };
// export default config;
