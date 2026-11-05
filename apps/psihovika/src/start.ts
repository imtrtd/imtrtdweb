import { createMiddleware, createStart } from "@tanstack/react-start";
import installPageTemplate from "../scripts/install-page.html?raw";
import { grokOgIdentity } from "virtual:grok-og-identity";
import {
  acceptsHtml,
  createHeadInjector,
  isDocumentPath,
  isInstallQuery,
  renderInstallPageHtml,
  renderWebManifest,
} from "../scripts/grok-pwa-shared.mjs";

/**
 * Cloudflare / TanStack Start half of the PWA chrome (Nitro still uses
 * `server/middleware/grok-pwa.ts`). Serves the web manifest, iOS install page,
 * and streams OG/PWA tags into HTML — so Workers builds without Nitro keep
 * `/__grok/manifest.webmanifest` and `?install=1` working.
 */
const grokPwaRequest = createMiddleware({ type: "request" }).server(
  async ({ next, request }) => {
    const method = request.method.toUpperCase();
    if (method !== "GET") return next();

    const url = new URL(request.url);
    const path = url.pathname;
    const urlWithQuery = path + url.search;
    const host =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      url.host;

    if (path === "/__grok/manifest.webmanifest" || path === "/__grok/manifest.json") {
      return new Response(renderWebManifest(host), {
        headers: {
          "content-type": "application/manifest+json; charset=utf-8",
          "cache-control": "no-cache",
        },
      });
    }

    if (
      isInstallQuery(urlWithQuery) &&
      isDocumentPath(path) &&
      acceptsHtml(request.headers.get("accept"))
    ) {
      const html = renderInstallPageHtml(installPageTemplate, {
        host,
        url: urlWithQuery,
      });
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-cache",
        },
      });
    }

    const result = await next();
    if (
      result instanceof Response &&
      result.body &&
      String(result.headers.get("content-type") ?? "").includes("text/html") &&
      !result.headers.get("content-encoding") &&
      isDocumentPath(path)
    ) {
      const injector = createHeadInjector({
        host,
        site: grokOgIdentity.site,
      });
      const transformed = result.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            for (const out of injector.push(chunk)) controller.enqueue(out);
          },
          flush(controller) {
            for (const out of injector.flush()) controller.enqueue(out);
          },
        }),
      );
      const headers = new Headers(result.headers);
      headers.delete("content-length");
      return new Response(transformed, {
        status: result.status,
        statusText: result.statusText,
        headers,
      });
    }

    return result;
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [grokPwaRequest],
}));
