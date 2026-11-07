// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Static build for the imtrtd-hq Worker (wrangler.jsonc -> assets.directory = ./dist).
// format "file" keeps the old URL shape: /selected -> selected.html, /work/x -> work/x.html,
// which the asset router serves at clean URLs (html_handling: auto-trailing-slash).
export default defineConfig({
  site: "https://imtrtd.space",
  output: "static",
  outDir: "./dist",
  trailingSlash: "never",
  build: { format: "file", assets: "assets" },
  compressHTML: true,
  vite: { plugins: [tailwindcss()] },
});
