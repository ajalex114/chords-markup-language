# cml-parser

TypeScript parser for Chords Markup Language v0.1. It implements the scope in [`PARSER_MVP.md`](../../PARSER_MVP.md) and follows the processing conventions in [`cml-spec`](../cml-spec/README.md).

```ts
import { parse } from "cml-parser";

const { ast, diagnostics } = parse('title "Demo"\nsection Verse\n||: G | C :|| x2\n');
```

`parse` always returns a best-effort AST. Errors never stop parsing. Diagnostics are sorted by line, column and code, and their positions are 1-based code-point columns.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm test` | Runs every `cml-spec` conformance fixture plus the unit tests. |
| `npm run typecheck` | Type-checks the sources and tests. |
| `npm run build` | Emits `dist/` (JavaScript and declarations). |

## Not yet supported

These are outside the MVP:

- Lyric lines (`>`) are ignored without a diagnostic.
- Alternate endings.
- Navigation markers (V15).
- Durations (V19).
