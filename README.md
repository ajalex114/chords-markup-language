# Chords Markup Language (CML)

**A standalone, text-based language for chord charts, lead sheets, and song structure.**

Version 0.1 — Draft

---

## What is CML?

CML is an open specification for representing the **harmonic and structural
content** of songs: chord charts, lead sheets, song forms, harmonic
progressions, arrangements, and (optionally) lyrics.

Unlike lyric-first formats such as ChordPro, **CML is measure-first**. The bar
(measure) is the primary unit, structure (sections, repeats, endings) is
first-class, and lyrics are an optional overlay.

```cml
title "Amazing Grace"
key G
tempo 72

section Verse
:|| G | C | G | D ||: x2
```

## Key properties

- **Measure-first** — bars are the atomic unit.
- **Structure-first** — sections, repeats, and endings are explicit constructs.
- **Not Markdown** — CML is its own language with its own grammar.
- **Not lyric-first** — lyrics are optional, secondary data.
- **Human-readable & easy to type** — uses the `|` bar line musicians already draw.
- **Machine-parseable** — unambiguous EBNF grammar; build a parser from the spec alone.
- **Renderer-agnostic** — target HTML, PDF, mobile, songbooks, worship software.

## Repository contents

| Path | Description |
|------|-------------|
| [`SPECIFICATION.md`](SPECIFICATION.md) | The full RFC-style v0.1 specification. |
| [`examples/`](examples/) | Example `.cml` documents referenced by the spec. |

## File format

- Extension: `.cml`
- Encoding: UTF-8
- One song per file

## Status

This is a **draft** specification. Draft versions (pre-1.0) may introduce
breaking changes. See the *Versioning Strategy* section of the specification.

## License

This specification is published as an open standard.
