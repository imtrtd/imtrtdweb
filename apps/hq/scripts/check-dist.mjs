// Post-build sanity check for dist/ (the Worker's asset directory). Fails the build on:
// missing pages the Worker / old links rely on, leftover "undefined"/"[object Object]" in HTML,
// and internal links to pages that do not exist.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
const must = [
  "index.html", "selected.html", "palette.html", "practice.html", "contact.html", "404.html", "launcher.html",
  "sitemap.xml", "robots.txt", "_headers", "og.png", "brand/logo-mark.svg",
  "sites/namenlos/index.html", "sites/pulse-box/index.html", "sites/natvik/index.html", "sites/cuebox/index.html",
  "work/namenlos.html", "work/pulse-box.html", "work/natvik.html", "work/cuebox.html", "work/truesightpsy.html",
];
const errors = [];
for (const f of must) if (!existsSync(join(dist, f))) errors.push(`missing dist/${f}`);

const html = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (n === "sites") continue; // demo bundles are copied as-is
    if (statSync(p).isDirectory()) walk(p);
    else if (n.endsWith(".html")) html.push(p);
  }
})(dist);

const exists = (url) => {
  const clean = url.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (clean === "/") return true;
  const p = join(dist, clean);
  return existsSync(p) || existsSync(p + ".html") || existsSync(join(p, "index.html"));
};
for (const file of html) {
  const s = readFileSync(file, "utf8");
  const rel = relative(dist, file);
  if (/>\s*undefined\s*</.test(s) || s.includes("[object Object]")) errors.push(`${rel}: "undefined" or [object Object] in output`);
  for (const [, href] of s.matchAll(/href="(\/[^"]*)"/g)) {
    if (href.startsWith("//")) continue;
    if (!exists(href)) errors.push(`${rel}: broken internal link ${href}`);
  }
}
if (errors.length) {
  console.error("[check-dist] " + errors.length + " problem(s):\n  " + [...new Set(errors)].join("\n  "));
  process.exit(1);
}
console.log(`[check-dist] ok — ${html.length} pages`);
