import { defineConfig } from "@neon/config/v1";

// Neon project for TrueSightPsy (`production` is the default branch).
// Applied by the `provision-neon` job in .github/workflows/deploy-psihovika.yml.
export default defineConfig({
  // Neon Auth is provisioned, but the app signs users in with its own Better
  // Auth (`src/lib/auth/server.ts`, tables from `migrations/0001_auth.sql`).
  auth: true,
  // Temporary branches (`neon checkout <name>`) expire after 7 days;
  // the default branch and already existing branches are left untouched.
  branch: (branch) => (branch.isDefault || branch.exists ? {} : { ttl: "7d" }),
});
