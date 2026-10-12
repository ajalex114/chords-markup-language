# cml-spec

Machine-readable companion to [`SPECIFICATION.md`](../../SPECIFICATION.md) for
CML v0.1. It contains no parser code. Parsers (such as
[`cml-parser`](../cml-parser)) test against it.

| Path | Contents |
|------|----------|
| `grammar/cml-0.1.ebnf` | EBNF from spec §16. Generated; run `npm run grammar`. |
| `schema/ast.schema.json` | JSON Schema for the canonical AST (§17). |
| `schema/expected.schema.json` | JSON Schema for a fixture's `expected.json`. |
| `types/ast.d.ts` | TypeScript types for the AST and diagnostics. |
| `diagnostics/diagnostics.json` | Diagnostic catalogue V1–V24: severity, recovery, MVP flag. |
| `fixtures/valid/*` | Documents that must parse with no diagnostics. |
| `fixtures/diagnostics/*` | Documents that must produce specific diagnostics. |

`npm test` checks the package is consistent: the grammar matches §16, the
catalogue matches the §18 table, and every fixture is schema-valid and uses
known codes with the right severity.

## Fixture format

Each fixture is a folder with:

- `input.cml`: the document, byte-exact (see `.gitattributes`).
- `expected.json`: `description`, `mvp`, `spec` (sections exercised), `ast`,
  and `diagnostics`.

A parser passes a fixture when:

1. Its AST deep-equals `ast` after removing every `span` property.
2. Its diagnostics, as `{ code, severity, line, column }` sorted by line, then
   column, then code, equal `diagnostics`. Messages are not compared.

Fixtures with `"mvp": true` must pass for the parser MVP
([`PARSER_MVP.md`](../../PARSER_MVP.md)).

## Processing conventions

The spec defines what is valid. The fixtures also pin down the details below,
including how processors recover from errors (§18.2). Errors never stop
parsing; the parser always returns a best-effort AST plus diagnostics.

**Positions.** Lines and columns are 1-based, and columns count Unicode code
points (a tab is one column). A diagnostic points at the first character of the
offending token, or column 1 for whole-line problems.

**Lines.** Blank lines and `//` comment lines are ignored everywhere. Other
lines are classified by their first token (§5.8). `//` starts a comment at line
start or after whitespace, outside quoted strings. Trailing whitespace never
produces a diagnostic.

**Metadata.**
- Keys are lowercased, and `scale` is stored as `key`.
- For duplicate keys the later value wins. Different `key`/`scale` values give
  V16 on the later line.
- `tempo` and `capo` are JSON numbers when the value is all digits. Every other
  value is a string, including unknown keys (V10).
- In quoted values `\"` becomes `"`.
- V22 and V23 apply only before the body starts. After that any property line
  is V20.

**Sections.**
- A name is a bare identifier or a quoted string, with an optional label
  (integer, identifier, or quoted string).
- A quoted name ending in whitespace and an integer is split into name and
  label: `"Verse 2"` gives type `Verse`, label `2`.
- Core names (§11.1) match case-insensitively, including aliases. `type` is the
  canonical name and `core` is true. A custom name keeps its text as `type`.
- `raw` is the name as written, without quotes or label.
- The implicit section exists only if measures come before the first header. A
  header followed by nothing is a section with no elements.

**Measure lines.**
- Bar tokens are matched longest first (`||:`, `:||`, `||`, `|`) at any
  position, so `|C|F|` equals `| C | F |`. A chord token ends at whitespace or
  at the start of a bar token.
- A line must open with `|` or `||:` and close with `|` or `:||`, with an
  optional count after `:||`. Content after the last bar is V5 and ignored. A
  line with fewer than two bars, or starting with `:||`, gives V5 and no
  measures.

**Chords.**
- Chords follow §8.3.1. The bass is split at the first `/` and must be exactly
  a root plus an optional accidental.
- An invalid root or bass is V6, and the token is dropped while its measure
  stays.
- `N.C.` and `NC` are no-chord markers with `root: null`.
- Qualities flagged by V11 or V19 are kept verbatim.
- A token starting with `@`, `!` or `*` is V21 and dropped.

**Repeats.** Problems are checked in this order:
1. A marker in the middle of a line is V17. It is treated as `|` and not paired.
2. `||:` while a repeat is open is V9, treated as `|`.
3. `:||` with no open repeat is V3, treated as `|`, and its count is ignored.
4. A repeat still open at a section header is V8, or at end of file V2. Both
   are reported at the `||:`, and the collected measures become a repeat group
   with count 2.
5. A count other than `xN`/`XN` with an integer N ≥ 1 is V4, and the count
   defaults to 2.

**Outside the MVP.** The parser MVP ignores lyric lines (`>`) without a
diagnostic and skips navigation lines with V15. Alternate endings (`[N]`) are
not covered by the fixtures.
