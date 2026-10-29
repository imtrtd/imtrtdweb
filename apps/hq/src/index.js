// Redirect plain-http requests to https, then serve static
// assets with security headers. Cache-Control / X-Robots-Tag come from public/_headers.
// www.imtrtd.space -> imtrtd.space is a 301 at the Cloudflare edge (not in this worker).

// Report-Only: the browser reports violations to the console but blocks nothing.
// Demo sites under /sites/* are excluded (their own bundles, inline styles, third-party embeds).
const CSP_REPORT_ONLY = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
	"style-src 'self' 'unsafe-inline'",
	"font-src 'self' data:",
	"img-src 'self' data: blob:",
	"media-src 'self' data: blob:",
	"connect-src 'self' https://admin.imtrtd.space https://cloudflareinsights.com https://static.cloudflareinsights.com",
	"frame-src 'self'",
	"frame-ancestors 'self'",
	"worker-src 'self' blob:",
	"manifest-src 'self'",
	"base-uri 'self'",
	"form-action 'self' mailto:",
	"object-src 'none'",
].join("; ");
export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		let proto = url.protocol;
		const fwd = request.headers.get("x-forwarded-proto");
		if (fwd) proto = fwd.split(",")[0].trim() + ":";
		const visitor = request.headers.get("cf-visitor");
		if (visitor) {
			try {
				const s = JSON.parse(visitor).scheme;
				if (s) proto = s + ":";
			} catch {}
		}
		if (proto === "http:") {
			url.protocol = "https:";
			return Response.redirect(url.toString(), 301);
		}

		let response = await env.ASSETS.fetch(request);

		// Per-site SPA fallback: extensionless deep links under /sites/<site>/
		// (e.g. /sites/namenlos/lettering) get that site's index.html.
		// Main hq pages and real asset misses keep their 404.
		const site = url.pathname.match(/^\/sites\/([a-z0-9-]+)\/./i);
		if (
			response.status === 404 &&
			site &&
			(request.method === "GET" || request.method === "HEAD") &&
			!/\.[a-z0-9]+$/i.test(url.pathname)
		) {
			// Fetch the shell unconditionally: conditional/range headers from the
			// original request would yield 304/206 for index.html, not the deep link.
			const shellHeaders = new Headers(request.headers);
			shellHeaders.delete("If-None-Match");
			shellHeaders.delete("If-Modified-Since");
			shellHeaders.delete("Range");
			const shell = await env.ASSETS.fetch(
				new Request(new URL(`/sites/${site[1]}/`, url), { method: request.method, headers: shellHeaders }),
			);
			if (shell.ok) response = new Response(shell.body, { status: 200, headers: shell.headers });
		}

		const headers = new Headers(response.headers);

		// Security headers
		headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
		headers.set("X-Content-Type-Options", "nosniff");
		headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		headers.set("X-Frame-Options", "SAMEORIGIN");
		headers.set("Content-Security-Policy", "frame-ancestors 'self'");
		headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
		if (!url.pathname.startsWith("/sites/")) headers.set("Content-Security-Policy-Report-Only", CSP_REPORT_ONLY);

		// 404 bodies (404.html) must not inherit the long cache of the path they were asked under
		// (e.g. a missing /assets/x.js would otherwise get "immutable" from _headers).
		if (response.status === 404) headers.set("Cache-Control", "public, max-age=0, must-revalidate");

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	},
};
