# CML Parser MVP

**Purpose:** define the first useful, testable parser for Chords Markup Language
(CML). The MVP reads common chord charts into a source-order AST; it does not
interpret or play the music.

## Included

- **Documents and metadata:** one UTF-8 song per document; LF and CRLF; blank
  lines; one metadata key/value per line. Support quoted values and common keys
  such as `title`, `artist`, `key`, `tempo`, and `time_signature`. Preserve
  unknown metadata keys.
- **Sections:** named sections, plus an implicit unnamed section for measures
  before the first `section`. Support simple and quoted names; defer labels and
  section aliases.
- **Measures:** bar-delimited measures with opening and closing bars; allow
  empty measures and multiple chords in a measure, for example `| C F | Am |`.
  Preserve chord order, but do not assign beat lengths or imply that chords
  divide the measure evenly.
- **Chord symbols:** parse a root (`A`–`G`), optional sharp/flat, optional
  quality text, and optional slash bass note. Accept common symbols such as
  `C7`, `Cmaj7`, `Csus4`, `Csus2`, `Cadd9`, `Cm7b5`, and `G/B`. Treat quality
  text as opaque and preserve it verbatim; do not require a fixed quality
  vocabulary. Recognize `N.C.` and `NC` as no-chord markers. Preserve the raw
  token for round-tripping and display.
- **Basic repeats:** parse `||:` and `:||` around a sequence of measures, with
  an optional `xN` count after the close. For example,
  `||: C | F :|| x3` is two measures played three total times; an omitted
  count means two total passes. Repeats are section-local and cannot nest.
- **Comments:** support whole-line and trailing `//` comments, recognized at
  line start or after whitespace, and not on lyric lines or inside quoted
  strings. `#` is never a comment marker, so `F#` and `C7#9` are plain chords.
- **AST and diagnostics:** produce source-ordered Song, Metadata, Section,
  Measure, Chord, and Repeat nodes. Retain raw text and line/column spans.
  Report malformed sections, measure boundaries, chord roots, and repeats with
  stable diagnostic codes; recover where practical to report more than one
  error.

## Deferred

Lyrics, explicit durations (such as `C(2)`), alternate endings, nested repeats,
navigation jumps, per-section key or meter changes, chord interpretation, and
arrangement expansion are outside this parser MVP. In particular, `| C F |`
is valid, but the parser records only the chord sequence—it does not assign
durations. Parenthesized duration syntax should not be introduced until its
interaction with chord-quality notation is specified.

## Acceptance criteria

The parser can parse the included-scope examples and focused valid/invalid
fixtures into the documented AST; preserve unknown metadata and chord qualities;
and report source locations for errors. Examples using deferred syntax are not
MVP conformance tests. Before implementation, specify repeat token placement
and line-boundary rules precisely enough that the repeat example above and
multi-line equivalents have the same unambiguous parse.
