import { applyD1Migrations, env } from "cloudflare:test";

declare module "cloudflare:test" {
	interface ProvidedEnv extends Env {
		TEST_MIGRATIONS: D1Migration[];
	}
}

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
