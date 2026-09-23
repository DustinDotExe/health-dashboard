import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const themePlugin = (): Plugin => ({
  name: "healthdash-omarchy-theme",
  configureServer(server) {
    server.middlewares.use("/api/theme", async (_request, response) => {
      try {
        const stateRoot = resolve(homedir(), ".local/state/omarchy/current");
        const [name, colors] = await Promise.all([
          readFile(resolve(stateRoot, "theme.name"), "utf8"),
          readFile(resolve(stateRoot, "theme/colors.toml"), "utf8"),
        ]);
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ name: name.trim(), colors }));
      } catch {
        response.statusCode = 404;
        response.end(JSON.stringify({ error: "theme-unavailable" }));
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), themePlugin()],
  server: { host: "127.0.0.1" },
});
