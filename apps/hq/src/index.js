// Redirect plain-http requests to https, then serve static assets.
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
		return env.ASSETS.fetch(request);
	},
};
