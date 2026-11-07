// Local static server for dist/ with the Worker's URL rules (clean URLs, /sites/<x>/ SPA fallback, 404 page).
// Listens on all interfaces, so a phone on the same Wi-Fi can open it (the Worker's http->https redirect is not applied).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
const root = new URL("../dist/", import.meta.url).pathname;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
const tryFile = async (p) => { try { if ((await stat(p)).isFile()) return p; } catch {} return null; };
createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const base = join(root, path);
  let file = (await tryFile(base)) || (await tryFile(base + ".html")) || (await tryFile(join(base, "index.html")));
  const site = path.match(/^\/sites\/([a-z0-9-]+)\/./i);
  if (!file && site && !extname(path)) file = await tryFile(join(root, "sites", site[1], "index.html"));
  if (!file) { res.writeHead(404, { "content-type": types[".html"] }); return res.end(await readFile(join(root, "404.html"))); }
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
  res.end(await readFile(file));
}).listen(Number(process.env.PORT || 4400), async () => {
  const port = process.env.PORT || 4400;
  const { networkInterfaces } = await import("node:os");
  const lan = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
  console.log(`dist on http://localhost:${port}`);
  for (const ip of lan) console.log(`  same Wi-Fi (phone): http://${ip}:${port}`);
});
