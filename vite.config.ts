import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    warmup: {
      clientFiles: ["./src/App.tsx", "./src/main.tsx", "./src/index.css"],
    },
    allowedHosts: true,
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          radix: ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs", "@radix-ui/react-accordion"],
          charts: ["recharts"],
          gsap: ["gsap"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
})
