import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-plugin";

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: "./wrangler.test.jsonc" },
			miniflare: {
				bindings: {
					ADMIN_TOKEN: "dev-admin-token",
					EDITOR_TOKEN: "dev-editor-token",
				},
			},
		}),
	],
});
