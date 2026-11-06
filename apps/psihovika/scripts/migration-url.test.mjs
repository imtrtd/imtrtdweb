import assert from "node:assert/strict";
import { test } from "node:test";
import { migrationDatabaseUrl } from "./migration-plan.mjs";

test("migrations prefer the direct Neon connection", () => {
  assert.equal(
    migrationDatabaseUrl({
      DATABASE_URL_UNPOOLED: " direct ",
      DATABASE_URL: "pooled",
      PSY_DATABASE_URL: "alias",
    }),
    "direct",
  );
});

test("migrations retain the existing URL fallbacks", () => {
  assert.equal(migrationDatabaseUrl({ DATABASE_URL_UNPOOLED: " ", DATABASE_URL: "pooled" }), "pooled");
  assert.equal(migrationDatabaseUrl({ PSY_DATABASE_URL: "alias" }), "alias");
  assert.equal(migrationDatabaseUrl({}), undefined);
});
