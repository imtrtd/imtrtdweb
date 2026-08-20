import { createReadStream, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { defineConfig } from "vite";
import { resolveIconSrc, syncBrandAssets } from "./build/sync-brand-assets";

const root = dirname(fileURLToPath(import.meta.url));
syncBrandAssets(root);

const markFiles = new Set(["/mark.png", "/favicon.png", "/favicon-32.png", "/favicon-180.png"]);

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      host: "0.0.0.0",
      fs: {
        allow: [
          root,
          "C:/Users/SablineKoster/.cursor/projects/d-Projects-ImTryingToDesign-site-source/assets",
        ],
      },
    },
    plugins: [
      {
        name: "sync-brand-assets",
        buildStart() {
          syncBrandAssets(root);
        },
        configureServer(server) {
          syncBrandAssets(root);
          server.middlewares.use((req, res, next) => {
            const url = req.url?.split("?")[0] ?? "";
            if (!markFiles.has(url)) {
              next();
              return;
            }
            if (existsSync(join(root, "public", url.slice(1)))) {
              next();
              return;
            }
            const live = resolveIconSrc(root);
            if (!live || !existsSync(live)) {
              next();
              return;
            }
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "no-store");
            createReadStream(live).pipe(res);
          });
        },
      },
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
      }),
    ],
  };
});
