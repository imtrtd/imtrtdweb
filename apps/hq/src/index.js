// Redirect plain-http requests to https, then serve static assets with security headers.
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
		headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	},
};
