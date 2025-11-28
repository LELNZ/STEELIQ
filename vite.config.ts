import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "./client",
  plugins: [
    react({ fastRefresh: false })
  ],
  resolve: { 
    alias: { 
      "@": "/src", 
      "@assets": "/src/assets", 
      "@shared": "../shared" 
    } 
  },
  server: { 
    host: true, 
    port: 5173, 
    strictPort: true 
  },
  preview: { 
    host: true, 
    port: 5173 
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    minify: false,  // Disable minification to reduce memory usage
    chunkSizeWarningLimit: 2000
  }
});