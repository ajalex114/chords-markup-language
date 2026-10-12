# CML v0.1 Open Spec Issues

Tracker for known problems in `SPECIFICATION.md` and `examples/`. Update the
status as items are resolved.

Status: `open`, `resolved`. Priority: **P1** blocks the parser, **P2** can become
a parser diagnostic, **P3** documentation cleanup.

## Summary

| # | Issue | Priority | Status |
|---|-------|----------|--------|
| 1 | Reserved sigils are inconsistent | P2 | resolved |
| 2 | `#` conflicts between chords and comments | P1 | resolved |
| 3 | Repeat grammar is conceptual, not token-level | P1 | resolved |
| 4 | Typo in §9.2 "`xN` (or `xN`)" | P3 | resolved |
| 5 | Lyric cell trimming not in grammar | P3 | resolved |
| 6 | Experimental durations in v0.1? | P2 | resolved |
| 7 | Navigation markers: reserved, but grammar present | P2 | resolved |
| 8 | Parentheses clash: chord qualities vs. durations | P1 | resolved |
| 9 | `b` ambiguity: flat vs. quality character | P1 | resolved |
| 10 | Identifier hyphens: §5.2 vs §16.1 | P2 | resolved |
| 11 | `section` line vs. metadata line | P1 | resolved |
| 12 | `||` reserved bar vs. `||:` tokens | P1 | resolved |
| 13 | Navigation examples don't match §14.1 tokens | P2 | resolved |
| 14 | Stale Option C wording in §12.4 | P3 | resolved |
| 15 | Validation table count (V1–V21 now) | P3 | resolved |
| 16 | Example gaps and bad `examples/18` | P3 | resolved |

## Details

### 1. Reserved sigils (P2) — resolved
**Decision:** `|`, `>`, `%`, `//` are assigned. `@`, `!`, `*` are reserved and
unassigned; a parser emits warning V21, skips the line or token, and continues,
so newer files still load in older processors.
**Done:** new §4.6.1 sigil table, §2.6, §4.6 and §21.4 made consistent, V21.
**Follow-ups:** add fixtures for `@foo` as a line, and `*` in a measure.

### 2. `#` vs. comment (P1) — resolved
**Decision:** comments use `//`, recognized at line start or after whitespace, and
not inside quoted strings or lyric lines. `#` is never a comment marker, so `F#m`
and `C7#9` are plain chords.
**Done:** §15, §16.1, §16.3, inline examples, `PARSER_MVP.md`, and `examples/`
(13, 14, 15, 18) updated.
**Follow-ups:** the spec mentions `#` in the §1/§2 prose only as a sharp, which is
fine. Check the `.gitignore`/README for any `#` comment mentions. Add parser
fixtures for `C7#9`, `F#m // note`, and `http://x` in a bare metadata value.

### 3. Repeat grammar is conceptual (P1) — resolved
**Decision:** `||:` and `:||` are bar lines that replace the opening and closing
`|`. In v0.1, `||:` must be the first token of a measure line and `:||` the last
(before an optional `xN` and comment). A repeat may span several lines. Mid-line
markers are an error (V17); this can be relaxed later without breaking valid
documents.
**Done:** §7.5.1, §9.1, §9.2, §9.4, §16.5 `MeasureLine`, §16.7, new V17.
**Follow-ups:** add parser fixtures for one-line and multi-line repeats, a
missing `:||` (V2), a stray `:||` (V3), and a mid-line marker (V17). Alternate
endings (§10) still need to be reconciled with the line rules.

### 4. §9.2 typo (P3) — resolved
Reworded to "`xN` or `XN`" as part of #3.

### 5. Lyric cell trimming (P3) — resolved
**Decision:** whitespace is always trimmed from lyric text and from each cell;
interior whitespace is kept.
**Done:** §12.6 new rule 5 (rules renumbered), §16.8 grammar note.

### 6. Experimental durations (P2) — resolved
**Decision:** §13.5 is a design note only. `C(0.5)` and `C(.)` are ordinary
chord tokens in v0.1 (quality = parenthesized text); no experimental warning.
**Done:** §13.5 reworded; V13 marked reserved/not emitted in v0.1.

### 7. Navigation markers (P2) — resolved
**Decision:** not parsed in v0.1. A line starting with `%` gives warning V15 and
is skipped. §14 is a design sketch. Aliases are kept.
**Done:** §14 status note, V15 reworded, §16.9 and AST `NavigationMarker` marked
as sketch (AST gains an optional `name`).
**Follow-ups:** specify navigation semantics in a later revision (§22.9),
including interaction with repeats and endings. Add a fixture for a `%` line (V15).

### 8. Parentheses clash (P1) — resolved
**Decision:** durations are deferred. `(` `)` in a chord token belong to the
quality; `C(2)` parses as quality `(2)`, never as a duration. When durations are
specified they will use a different delimiter.
**Done:** new §8.4.1, §13 status note, `ChordItem` no longer includes `Duration`,
AST `duration` reserved (always null), `examples/13` annotated, and warning V19
for digits-only parentheses such as `C(2)`.
**Follow-ups:** choose the duration delimiter when §13 is specified; add fixtures
for `C7(b9)`, `C(b5)`, `C(2)` (V19) and unbalanced `C7(b9` (V11). This also
reduces #6 (experimental durations) to documentation: the spec no longer parses
them.

### 9. `b` ambiguity (P1) — resolved
**Decision:** the accidental binds first; the remainder is the quality. `Bb` =
B-flat, `Bbb5` = B-flat + `b5`, `Cb5` = C-flat + `5`. C with flat five is written
`C(b5)`.
**Done:** new §8.3.1 with a table, and a note in the §16.6 grammar.
**Follow-ups:** add parser fixtures for each row of the §8.3.1 table, and for
slash-chord basses such as `G/Bb`.

### 10. Identifier hyphens (P2) — resolved
**Decision:** hyphens are allowed in every identifier, including metadata keys.
**Done:** §5.2 key pattern is now `[A-Za-z_][A-Za-z0-9_-]*`, matching §16.1.

### 11. `section` vs. metadata (P1) — resolved
**Decision:** `section` is a reserved word. Lines are classified by first token
(new §5.8). Property lines are header-only; one after the body starts is error
V20. Mid-song tempo, meter and key changes are real and common, so they are
reserved (not forbidden forever): the intended future form is a property line
between measures that takes effect from the next measure.
**Done:** §5.1, §5.2, §5.5, new §5.8, §16.3 note, V20, §22.10 rewritten.
**Follow-ups:** specify the mid-song change syntax and its AST "change" node
(§22.10); decide how it interacts with repeats (a change inside a repeat). Add
fixtures for `section` as a key, and for `tempo 90` after a measure line (V20).

### 12. `||` vs. `||:` (P1) — resolved
**Decision:** longest-match tokenization (`||:`, `:||`, `||`, `|`). A plain `||`
is accepted as `|` with warning V18.
**Done:** §7.5.1.

### 13. Navigation example mismatch (P2) — resolved
**Decision:** table, grammar and examples now agree: six base tokens with
aliases, four compound `*-al-*` tokens without aliases, and an optional name
(`%segno A`, `%ds A`) for targets and jumps.
**Done:** §14.1 table and name rules, §14.2 examples (now equivalent), §16.9,
`examples/14-navigation.cml`.
**Follow-ups:** the aliases `%goto-end` (means "to coda") and `%ending` (means
coda) are easy to misread; revisit when navigation is specified.

### 14. Stale Option C wording (P3) — resolved
**Done:** §12.4 retitled "Rejected Alternative" with a note that `lyrics` is not
reserved and the examples are not valid v0.1 syntax.

### 15. Validation table count (P3) — resolved
**Done:** the table is V1–V21; no stale V1–V15/V16 references remain in the spec.
V15 reflects #7, and V13 is marked reserved. `HANDOFF.md` is local-only and stale.

### 16. Example gaps (P3) — resolved
**Done:** added `09-accidentals`, `10-slash-and-nochord`, `12-lyric-cells`,
`16-mvp-song` and `17-validation-warnings-and-errors` (V15, V17–V21).
`18-validation-errors` shows V6, V3, V2.
**Follow-up:** these are illustrative examples, not conformance fixtures. The
`cml-spec` package should add expected-AST/diagnostic files per example.
`03-repeats.cml` still uses alternate endings, which are outside the MVP.
