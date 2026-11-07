import type { Test } from "@/data/build";
import type { ContentOverride } from "@/lib/cms/types";

/** Merge a DB override row onto a catalog method (null fields keep the base). */
export function applyContentOverride(
  test: Test,
  ov: Pick<ContentOverride, "title" | "lead" | "source" | "warn" | "notes"> | null | undefined,
): Test {
  if (!ov) return test;
  return {
    ...test,
    title: ov.title?.trim() || test.title,
    lead: ov.lead?.trim() || test.lead,
    source: ov.source?.trim() || test.source,
    warn: ov.warn?.trim() || test.warn,
  };
}
