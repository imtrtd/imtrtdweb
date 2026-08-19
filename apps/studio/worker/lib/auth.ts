export type AdminRole = "owner" | "editor";

export type AdminSession = {
	role: AdminRole;
};

function extractToken(request: Request): string | null {
	const auth = request.headers.get("Authorization");
	if (auth?.startsWith("Bearer ")) {
		return auth.slice(7);
	}
	return request.headers.get("X-Admin-Token");
}

export function getAdminSession(
	request: Request,
	env: Env,
): AdminSession | null {
	const token = extractToken(request);
	if (!token) {
		return null;
	}

	if (env.ADMIN_TOKEN && token === env.ADMIN_TOKEN) {
		return { role: "owner" };
	}

	if (env.EDITOR_TOKEN && token === env.EDITOR_TOKEN) {
		return { role: "editor" };
	}

	return null;
}

/** @deprecated use getAdminSession */
export function requireAdmin(request: Request, env: Env): boolean {
	return getAdminSession(request, env) !== null;
}

export function canDelete(session: AdminSession): boolean {
	return session.role === "owner";
}
