import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FixtureExpectation } from "cml-spec/types";
import { parse } from "../src/index.js";
import { SEVERITY } from "../src/diagnostics.js";

const require = createRequire(import.meta.url);
const specRoot = dirname(require.resolve("cml-spec/package.json"));
const fixturesRoot = join(specRoot, "fixtures");

function stripSpans(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSpans);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (k !== "span") out[k] = stripSpans(v);
    return out;
  }
  return value;
}

const fixtures = readdirSync(fixturesRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((group) =>
    readdirSync(join(fixturesRoot, group.name), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ name: `${group.name}/${d.name}`, dir: join(fixturesRoot, group.name, d.name) })),
  );

describe("conformance fixtures", () => {
  it("finds fixtures", () => expect(fixtures.length).toBeGreaterThan(0));

  it.each(fixtures)("$name", ({ dir }) => {
    const input = readFileSync(join(dir, "input.cml"), "utf8");
    const expected = JSON.parse(readFileSync(join(dir, "expected.json"), "utf8")) as FixtureExpectation;
    const { ast, diagnostics } = parse(input);
    expect(stripSpans(ast)).toEqual(stripSpans(expected.ast));
    expect(diagnostics.map(({ code, severity, line, column }) => ({ code, severity, line, column }))).toEqual(
      expected.diagnostics,
    );
  });
});

describe("diagnostic catalogue", () => {
  const catalogue = JSON.parse(readFileSync(join(specRoot, "diagnostics", "diagnostics.json"), "utf8")) as {
    diagnostics: Array<{ code: string; severity: string; status?: string }>;
  };
  const byCode = new Map(catalogue.diagnostics.map((d) => [d.code, d]));

  it.each(Object.entries(SEVERITY))("%s severity matches cml-spec", (code, severity) => {
    expect(byCode.get(code)?.severity).toBe(severity);
    expect(byCode.get(code)?.status).not.toBe("reserved");
  });
});
