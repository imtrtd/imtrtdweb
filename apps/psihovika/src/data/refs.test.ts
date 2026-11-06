import assert from "node:assert/strict";
import { test } from "node:test";
import { metaFor } from "./refs.ts";
import type { Test } from "./build.ts";

function fake(source: string, id = "x"): Test {
  return {
    id,
    title: id,
    lead: "",
    category: "life",
    school: "test",
    scale: "agree",
    shape: "index",
    items: [],
    frame: "",
    source,
    focus: false,
    weight: 1,
  };
}

test("metaFor does not treat (1935, 1940) as author+year", () => {
  const meta = metaFor(fake("Депрессивная позиция, Klein (1935, 1940). Учебные пункты."));
  assert.equal(meta.citations.length, 1);
  assert.equal(meta.citations[0]?.authors, "Klein");
  assert.equal(meta.citations[0]?.year, "1935");
  assert.equal(meta.primaryNote, undefined);
});

test("metaFor leaves year-only paren lists unparsed", () => {
  const meta = metaFor(fake("См. отчёт (1975, 1984) без автора."));
  assert.equal(meta.citations.length, 0);
});

test("metaFor parses Author (2002) without inventing primaryNote", () => {
  const meta = metaFor(
    fake("Конструкт тёмной триады, Paulhus & Williams (2002). Это не SD3."),
  );
  assert.equal(meta.citations[0]?.authors, "Paulhus & Williams");
  assert.equal(meta.citations[0]?.year, "2002");
  assert.equal(meta.primaryNote, undefined);
});
