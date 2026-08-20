import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				singleWorker: true,
				wrangler: { configPath: "./wrangler.test.jsonc" },
				miniflare: {
					bindings: {
						ADMIN_TOKEN: "dev-admin-token",
						EDITOR_TOKEN: "dev-editor-token",
					},
				},
			},
		},
	},
});
