import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:7071",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            // Khi không bật Azure Functions local (cổng 7071), trả về 503 êm đềm, không làm tràn log Vite
            try {
              if (res && "writeHead" in res && !res.headersSent) {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Local Azure Functions offline", code: "ECONNREFUSED" }));
              }
            } catch {
              // Bỏ qua lỗi socket đã đóng
            }
          });
        }
      }
    }
  },
  build: {
    outDir: "dist"
  }
});
