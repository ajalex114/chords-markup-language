// Extracts the EBNF blocks of SPECIFICATION.md §16 into grammar/cml-0.1.ebnf.
// Usage: node scripts/extract-grammar.mjs [--check]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
export const specPath = join(pkgDir, "..", "..", "SPECIFICATION.md");
export const grammarPath = join(pkgDir, "grammar", "cml-0.1.ebnf");

export function extractGrammar(specText) {
  const lines = specText.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((l) => l.startsWith("## 16."));
  const end = lines.findIndex((l, i) => i > start && l.startsWith("## 17."));
  if (start < 0 || end < 0) throw new Error("Could not find §16 in SPECIFICATION.md");

  const out = [
    "(* CML v0.1 grammar, generated from SPECIFICATION.md §16.",
    "   Do not edit by hand: run `npm run grammar` in packages/cml-spec. *)",
  ];
  let heading = null;
  let inBlock = false;
  for (const line of lines.slice(start, end)) {
    if (line.startsWith("### ")) heading = line.slice(4).trim();
    else if (line.trim() === "```ebnf") {
      inBlock = true;
      out.push("", `(* ===== ${heading} ===== *)`);
    } else if (inBlock && line.trim() === "```") inBlock = false;
    else if (inBlock) out.push(line);
  }
  return out.join("\n") + "\n";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const generated = extractGrammar(readFileSync(specPath, "utf8"));
  if (process.argv.includes("--check")) {
    const current = existsSync(grammarPath) ? readFileSync(grammarPath, "utf8") : "";
    if (current !== generated) {
      console.error("grammar/cml-0.1.ebnf is out of date. Run `npm run grammar`.");
      process.exit(1);
    }
    console.log("grammar is up to date");
  } else {
    writeFileSync(grammarPath, generated);
    console.log(`wrote ${grammarPath}`);
  }
}
