export function requireAdmin(request: Request, env: Env): boolean {
	const token = env.ADMIN_TOKEN;
	if (!token) {
		// Local/dev without secret: allow only when explicitly open via header match "dev"
		return false;
	}

	const auth = request.headers.get("Authorization");
	if (auth?.startsWith("Bearer ") && auth.slice(7) === token) {
		return true;
	}

	const headerToken = request.headers.get("X-Admin-Token");
	if (headerToken === token) {
		return true;
	}

	return false;
}
