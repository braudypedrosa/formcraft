import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { playground: "index.html", docs: "docs/index.html" },
    },
  },
  server: { port: 5173, strictPort: true },
});
