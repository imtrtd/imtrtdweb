import { hashPassword } from "better-auth/crypto";
import type { Sql } from "@/lib/db";
import { DEMO_ADMIN } from "@/lib/cms/demo-credentials";

export { DEMO_ADMIN };

/**
 * Idempotent seed: demo email/password user + owner team so /admin works
 * without a manual registration dance on fresh PGLite / empty Neon.
 */
export async function seedDemoAdmin(db: Sql): Promise<void> {
  const existing = await db<{ id: string }>`
    select id from "user" where email = ${DEMO_ADMIN.email} limit 1
  `;
  if (existing[0]) {
    await ensureDemoTeam(db, existing[0].id);
    return;
  }

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(DEMO_ADMIN.password);

  await db`
    insert into "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
    values (
      ${DEMO_ADMIN.userId},
      ${DEMO_ADMIN.name},
      ${DEMO_ADMIN.email},
      ${true},
      ${null},
      ${now},
      ${now}
    )
    on conflict (id) do nothing
  `;
  await db`
    insert into "account" (
      id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
    )
    values (
      ${"acct_psy_demo_admin"},
      ${DEMO_ADMIN.userId},
      ${"credential"},
      ${DEMO_ADMIN.userId},
      ${passwordHash},
      ${now},
      ${now}
    )
    on conflict (id) do nothing
  `;

  await ensureDemoTeam(db, DEMO_ADMIN.userId);
}

async function ensureDemoTeam(db: Sql, userId: string): Promise<void> {
  const teams = await db<{ id: string }>`
    select id from teams where id = ${DEMO_ADMIN.teamId} limit 1
  `;
  if (!teams[0]) {
    await db`
      insert into teams (id, name, invite_code, created_by)
      values (
        ${DEMO_ADMIN.teamId},
        ${DEMO_ADMIN.teamName},
        ${DEMO_ADMIN.inviteCode},
        ${userId}
      )
      on conflict (id) do nothing
    `;
  }
  await db`
    insert into team_members (team_id, user_id, role)
    values (${DEMO_ADMIN.teamId}, ${userId}, ${"owner"})
    on conflict (team_id, user_id) do nothing
  `;
}
