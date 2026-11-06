// Validates the cml-spec package for internal consistency:
//  - grammar/cml-0.1.ebnf matches SPECIFICATION.md §16
//  - diagnostics.json matches the §18 table (codes and severities)
//  - every fixture has input.cml and a schema-valid expected.json whose
//    diagnostics exist in the catalogue, match its severities, and are sorted
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { extractGrammar, specPath, grammarPath } from "./extract-grammar.mjs";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (msg) => errors.push(msg);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// Grammar
const spec = readFileSync(specPath, "utf8");
if (!existsSync(grammarPath) || readFileSync(grammarPath, "utf8") !== extractGrammar(spec)) {
  fail("grammar/cml-0.1.ebnf is out of date with SPECIFICATION.md §16 (run `npm run grammar`)");
}

// Diagnostics vs spec table
const catalogue = readJson(join(pkgDir, "diagnostics", "diagnostics.json")).diagnostics;
const byCode = new Map(catalogue.map((d) => [d.code, d]));
const specCodes = new Map();
for (const m of spec.matchAll(/^\| (V\d+) \|.*?\| \*\*(error|warning)\*\* \|/gm)) specCodes.set(m[1], m[2]);
if (specCodes.size === 0) fail("no validation codes found in SPECIFICATION.md §18");
for (const [code, severity] of specCodes) {
  const d = byCode.get(code);
  if (!d) fail(`diagnostics.json is missing ${code}`);
  else if (d.severity !== severity) fail(`${code}: catalogue says ${d.severity}, spec says ${severity}`);
}
for (const d of catalogue) if (!specCodes.has(d.code)) fail(`diagnostics.json has ${d.code}, which is not in the spec table`);

// Fixtures
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
ajv.addSchema(readJson(join(pkgDir, "schema", "ast.schema.json")), "ast.schema.json");
const validate = ajv.compile(readJson(join(pkgDir, "schema", "expected.schema.json")));

const fixturesDir = join(pkgDir, "fixtures");
const categories = readdirSync(fixturesDir).filter((c) => statSync(join(fixturesDir, c)).isDirectory());
let count = 0;
for (const category of categories) {
  for (const name of readdirSync(join(fixturesDir, category))) {
    const dir = join(fixturesDir, category, name);
    if (!statSync(dir).isDirectory()) continue;
    const id = relative(fixturesDir, dir).replace(/\\/g, "/");
    count++;
    if (!existsSync(join(dir, "input.cml"))) fail(`${id}: missing input.cml`);
    const expectedPath = join(dir, "expected.json");
    if (!existsSync(expectedPath)) {
      fail(`${id}: missing expected.json`);
      continue;
    }
    const expected = readJson(expectedPath);
    if (!validate(expected)) {
      for (const e of validate.errors) fail(`${id}: expected.json ${e.instancePath || "/"} ${e.message}`);
      continue;
    }
    const diags = expected.diagnostics;
    if (category === "valid" && diags.length > 0) fail(`${id}: fixtures in valid/ must have no diagnostics`);
    if (category === "diagnostics" && diags.length === 0) fail(`${id}: fixtures in diagnostics/ must have diagnostics`);
    diags.forEach((d, i) => {
      const entry = byCode.get(d.code);
      if (!entry) return fail(`${id}: unknown diagnostic ${d.code}`);
      if (entry.severity !== d.severity) fail(`${id}: ${d.code} must be ${entry.severity}`);
      if (entry.status === "reserved") fail(`${id}: ${d.code} is reserved and never emitted in v0.1`);
      if (expected.mvp && !entry.mvp) fail(`${id}: MVP fixture expects non-MVP code ${d.code}`);
      const prev = diags[i - 1];
      if (prev && (prev.line > d.line || (prev.line === d.line && (prev.column > d.column ||
          (prev.column === d.column && prev.code.localeCompare(d.code, "en", { numeric: true }) > 0))))) {
        fail(`${id}: diagnostics are not sorted at index ${i}`);
      }
    });
  }
}
if (count === 0) fail("no fixtures found");

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} problem(s) found`);
  process.exit(1);
}
console.log(`cml-spec OK: grammar, ${catalogue.length} diagnostics, ${count} fixtures`);
