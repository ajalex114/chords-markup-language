# Chords Markup Language (CML)

**Version 0.1 — Draft**

Status: Draft
Document type: Open Specification
License: This specification is published as an open standard.

---

## Notational Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**,
**SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this
document are to be interpreted as described in RFC 2119 and RFC 8174.

Grammar fragments are expressed in a variant of Extended Backus–Naur Form
(EBNF), defined formally in [Section 16](#16-formal-grammar). Inline code,
examples, and terminal strings are shown in `monospace`.

Throughout this document, the term **author** refers to a human writing CML by
hand, the term **processor** (or **parser**) refers to software that reads CML
and produces an Abstract Syntax Tree (AST), and the term **renderer** refers to
software that presents CML (or its AST) to an end user.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Design Philosophy](#2-design-philosophy)
3. [Core Concepts](#3-core-concepts)
4. [File Format](#4-file-format)
5. [Metadata](#5-metadata)
6. [Sections](#6-sections)
7. [Measures](#7-measures)
8. [Chords](#8-chords)
9. [Repeats](#9-repeats)
10. [Alternate Endings](#10-alternate-endings)
11. [Song Form](#11-song-form)
12. [Lyrics](#12-lyrics)
13. [Rhythm and Timing](#13-rhythm-and-timing)
14. [Navigation Constructs](#14-navigation-constructs)
15. [Comments](#15-comments)
16. [Formal Grammar](#16-formal-grammar)
17. [Abstract Syntax Tree (AST)](#17-abstract-syntax-tree-ast)
18. [Validation Rules](#18-validation-rules)
19. [Rendering Recommendations](#19-rendering-recommendations)
20. [Examples](#20-examples)
21. [Versioning Strategy](#21-versioning-strategy)
22. [Future Roadmap](#22-future-roadmap)
- [Appendix A. Terminology and Synonyms](#appendix-a-terminology-and-synonyms)

---

## 1. Introduction

### 1.1 Purpose

Chords Markup Language (CML) is a standalone, text-based language for
representing the **harmonic and structural content of songs**: chord charts,
lead sheets, song structures, harmonic progressions, arrangements, and
(optionally) lyrics.

CML exists because the dominant plain-text formats for chord notation were
designed lyric-first. In formats such as ChordPro, the primary unit is a line
of lyrics, and chords are annotations positioned above syllables. This model is
excellent for congregational lyric sheets but poor for expressing the
information a musician actually reads from a chart: *how many bars, in what
order, with which repeats, and in what form.*

CML inverts that model. In CML the **measure (bar) is the primary unit** and
lyrics are an optional overlay. This makes CML suitable for jazz lead sheets,
worship charts, pop/rock session charts, folk songbooks, and any context where
the *structure* of the music — not the text being sung — is the thing being
communicated.

### 1.2 Design Goals

CML is designed to be, in priority order:

1. **Measure-first** — bars are first-class citizens; everything else hangs off
   the sequence of measures.
2. **Structure-first** — sections, repeats, endings, and navigation are
   explicit, first-class constructs rather than typographic conventions.
3. **Human-readable** — a chart MUST be comprehensible when read as raw text.
4. **Easy to type** — the common case (a chord progression) MUST be writable
   with characters already used by musicians: `|`, chord names, and spaces.
5. **Machine-parseable** — the grammar MUST be unambiguous and expressible in
   EBNF, enabling conforming parsers to be built from this document alone.
6. **Renderer-agnostic** — the same CML document MUST be renderable to HTML,
   PDF, mobile apps, songbooks, printed chord charts, and worship presentation
   software without modification.
7. **Extensible** — the format MUST allow future features (Nashville numbers,
   tablature, MIDI, etc.) to be added without breaking existing documents.

### 1.3 Scope

This specification defines:

- The lexical and syntactic structure of CML source text.
- The semantics of metadata, sections, measures, chords, repeats, endings,
  lyrics, rhythm annotations, navigation markers, and comments.
- A canonical Abstract Syntax Tree (AST) and a canonical JSON serialization of
  that AST.
- Conformance requirements for processors and renderers.
- Validation and error-reporting expectations.

### 1.4 Non-Goals

CML does **not** attempt to be any of the following:

- **A complete music notation language.** CML is not a replacement for
  MusicXML, MEI, LilyPond, or staff notation. It does not encode exact note
  pitches, rests, voicing, dynamics, articulation, or engraving instructions.
- **A Markdown extension or dialect.** CML is its own language with its own
  grammar. It is not parsed by a Markdown processor and does not inherit
  Markdown syntax.
- **A lyric-first format.** Lyrics are optional, secondary data. A valid CML
  document may contain no lyrics at all.
- **An audio or performance format.** CML describes a chart, not a rendered
  performance. (MIDI export is discussed as future work in
  [Section 22](#22-future-roadmap) but is out of scope for v0.1.)
- **A tablature or fingering language** in v0.1. (See the roadmap.)

---

## 2. Design Philosophy

### 2.1 Measure-First Design

The atomic structural unit of CML is the **measure** (bar). A song body is,
fundamentally, an ordered sequence of measures grouped into sections. Chords
live *inside* measures; lyrics, when present, are *aligned to* measures or to
positions within measures. This is the single most important design decision in
CML and distinguishes it from every lyric-first format.

Practically, this means the simplest useful CML document is a line of bars:

```cml
| C | F | G | C |
```

This is already a complete, valid progression. Nothing else is required.

### 2.2 Structure-First Design

Musical structure in CML is **explicit and first-class**, never implied by
layout or whitespace:

- **Sections** are declared, not inferred from blank lines.
- **Repeats** are delimited constructs (`||:` … `:||`) with an optional explicit
  repeat count, not an instruction written in prose like "repeat 2x".
- **Alternate endings** are numbered, bracketed structures.
- **Navigation** (coda, segno, D.C., D.S., Fine) is reserved for first-class
  markers (specified for a future revision; see Sections 14 and 21).

Because structure is explicit, a processor can build a complete, unambiguous
model of the song form without heuristics.

### 2.3 Lyrics Are Optional

Lyrics are an **optional overlay** on the measure stream. A CML document is
fully valid and useful with zero lyrics. When lyrics are present, they are
attached to measures (or positions within measures) rather than being the
backbone of the document. This is the inverse of ChordPro and is intentional.

### 2.4 Human-Readable Syntax

A central requirement is that raw CML be readable by a musician with no tooling.
The bar line `|` is chosen deliberately because it is the universal symbol for a
measure boundary in Western notation and is already how musicians sketch charts
on paper. Chord symbols use the conventional pop/jazz spelling (`Cmaj7`,
`F#m7b5`, `G/B`). Metadata uses `key value` lines that read like English.

### 2.5 Machine-Parseable Grammar

Every construct in CML is defined by an unambiguous grammar
([Section 16](#16-formal-grammar)). The language is designed to be parseable
with a straightforward tokenizer plus a recursive-descent or table-driven
parser. There are no context-sensitive constructs that require backtracking over
unbounded input, and no reliance on indentation for meaning.

### 2.6 Extensible Ecosystem

CML reserves clear extension points so the ecosystem can grow without forking
the language:

- **Unknown metadata keys** are preserved (not errored) by conforming
  processors, enabling tool-specific metadata.
- **Custom section names** are permitted; only a core set carries defined
  semantics.
- **Chord extension strings** are parsed permissively (see
  [Section 8](#8-chords)) so new chord qualities do not break parsers.
- **Reserved sigils** (`@`, `!`, `*`) are set aside for future directives.

A conforming processor **SHOULD** preserve constructs it does not understand
rather than discard them, and **SHOULD** surface them as warnings rather than
fatal errors where the grammar permits.

---

## 3. Core Concepts

This section defines the conceptual vocabulary of CML. Concrete syntax is given
in later sections; here we fix the data model.

| Concept         | Definition |
|-----------------|------------|
| **Song**        | The top-level entity represented by exactly one CML file. A Song consists of a Metadata block and a Body (an ordered list of Sections and/or Measures). |
| **Metadata**    | A set of key/value properties describing the Song as a whole (title, key, tempo, etc.). See [Section 5](#5-metadata). |
| **Section**     | A named, ordered region of the Body (e.g. `Verse`, `Chorus`). A Section contains an ordered list of Measures and structural constructs (repeats, endings). See [Section 6](#6-sections). |
| **Measure (Bar)** | The primary structural unit. An ordered container of zero or more Chords (and optional rhythm/lyric data), delimited by bar lines `|`. See [Section 7](#7-measures). |
| **Chord**       | A harmonic symbol (root + optional accidental + optional quality/extensions + optional bass note). See [Section 8](#8-chords). |
| **Repeat**      | A first-class construct marking a span of measures to be played more than once, with an optional repeat count. See [Section 9](#9-repeats). |
| **Ending**      | A numbered alternate ending (volta) within or following a repeated span. See [Section 10](#10-alternate-endings). |
| **Coda / Navigation** | Jump and marker constructs (Coda, Segno, D.C., D.S., Fine) controlling traversal order. Reserved; see [Section 14](#14-navigation-constructs). |
| **Lyrics**      | Optional text aligned to measures or positions. See [Section 12](#12-lyrics). |
| **Arrangement** | The derived, fully-expanded performance order of measures after resolving repeats, endings, and navigation. The Arrangement is a *computed* view, not stored syntax. |

### 3.1 The Song Model (informal)

```
Song
├── Metadata (0..* properties)
└── Body
    └── Section*            (a Body is a sequence of Sections; a leading
        ├── name             group of measures before any `section`
        └── Element*         declaration forms an implicit section)
            ├── Measure
            ├── RepeatGroup (contains Measures and Endings)
            └── NavigationMarker (reserved)
```

### 3.2 Source Order vs. Arrangement Order

CML stores music in **source order** — the order written in the file. The
**Arrangement** is the expansion of that source into the order it is actually
performed, obtained by unrolling repeats (according to their counts), selecting
alternate endings on successive passes, and following navigation jumps.
Processors **MUST** be able to produce the source-order AST; producing the
expanded Arrangement is **RECOMMENDED** and defined in
[Section 17.4](#174-arrangement-expansion).

---

## 4. File Format

### 4.1 File Extension

CML files **MUST** use the extension `.cml`.

### 4.2 Encoding

CML files **MUST** be encoded in UTF-8. A processor **MAY** accept and skip a
leading UTF-8 byte order mark (BOM) but files **SHOULD NOT** include one.

### 4.3 Line Endings

Lines **MAY** be terminated by LF (`\n`) or CRLF (`\r\n`). A conforming
processor **MUST** treat both identically. A final newline at end of file is
**OPTIONAL**.

### 4.4 One Song Per File

A `.cml` file **MUST** contain exactly one Song. Multi-song collections
(songbooks) are produced by referencing or concatenating multiple `.cml` files
at the application layer, not within a single file. A future `.cmlbook` /
collection format is reserved but not specified here.

### 4.5 Whitespace

Outside of quoted strings and lyric text, runs of spaces and tabs are not
significant beyond token separation. Blank lines are not significant to meaning
(they do **not** delimit sections) but **MAY** be used freely for readability.

### 4.6 Future Extension Strategy

To allow forward evolution:

- A document **MAY** declare the spec version it targets with a `version`
  metadata key (e.g. `version "0.1"`). If absent, processors **SHOULD** assume
  the latest version they implement.
- The sigils `@`, `!`, and `*` at the start of a token are **reserved** for
  future directive syntax and **MUST NOT** be used by authors in v0.1 except
  where this document assigns them meaning.
- Unknown metadata keys and unknown chord qualities **MUST NOT** cause a fatal
  parse error (see Sections 5 and 8).

---

## 5. Metadata

### 5.1 Overview

Metadata describes the Song as a whole. Metadata appears as a series of
**property lines**, conventionally (but not necessarily) at the top of the file,
before the first `section` or measure.

### 5.2 Syntax

A metadata property is a line of the form:

```
<key> <value>
```

- `<key>` is an identifier (`[A-Za-z_][A-Za-z0-9_]*`), case-insensitive, and is
  normalized to lowercase by processors.
- `<value>` is either:
  - a **quoted string** (`"..."`) — REQUIRED when the value contains spaces or
    punctuation; or
  - a **bare token** (no whitespace) — permitted for simple values such as
    `G`, `72`, `4/4`.

One property per line. A property line **MUST NOT** begin with a bar line `|`
(which would make it a measure line).

### 5.3 Core Metadata Keys

The following keys are defined. All are **OPTIONAL**; a valid Song may have no
metadata.

| Key              | Value type            | Example                 | Notes |
|------------------|-----------------------|-------------------------|-------|
| `title`          | string                | `title "Amazing Grace"` | Song title. |
| `artist`         | string                | `artist "Traditional"`  | Performing artist. |
| `composer`       | string                | `composer "John Newton"`| Writer/composer. |
| `album`          | string                | `album "Hymns Vol. 1"`  | Source album/collection. |
| `key`            | key token             | `key G`                 | Tonal key; see 5.4. |
| `scale`          | key token             | `scale G`               | Synonym for `key`; see 5.4. |
| `tempo`          | integer (BPM)         | `tempo 72`              | Beats per minute. |
| `time_signature` | ratio token           | `time_signature 4/4`    | Default meter; see 5.5. |
| `capo`           | integer ≥ 0           | `capo 2`                | Guitar capo fret. |
| `copyright`      | string                | `copyright "Public Domain"` | Rights statement. |
| `version`        | string                | `version "0.1"`         | Targeted CML spec version. |

### 5.4 The `key` Value

A `key` value is a root note (`A`–`G`), an optional accidental (`#` or `b`), and
an OPTIONAL mode suffix `m` for minor (e.g. `G`, `Eb`, `F#m`, `Bbm`). Absence of
`m` denotes major. Processors **SHOULD** validate the root/accidental but
**SHOULD NOT** reject unrecognized mode suffixes (future modes).

#### 5.4.1 The `scale` Synonym

Because `key` and `scale` are often used interchangeably by musicians, CML
accepts `scale` as a synonym for `key`:

- `scale` takes the same value syntax as `key`.
- A processor **MUST** normalize `scale` to the `key` field in the AST. Both
  spellings produce identical AST output.
- If a document contains both `key` and `scale` with different values, the
  processor **MUST** report error V16. If the values are identical, the
  processor **MUST NOT** report an error.

`scale` does not denote a mode or scale-degree collection (such as Dorian or
harmonic minor) in v0.1. Such values are reserved for a future revision.

### 5.5 The `time_signature` Value

A `time_signature` value is `<numerator>/<denominator>` where both are positive
integers (e.g. `4/4`, `3/4`, `6/8`, `12/8`). This meter is the Song default and
MAY be overridden per-section in a future revision (reserved).

### 5.6 Unknown Keys

If a processor encounters a metadata key it does not recognize, it **MUST NOT**
fail. It **MUST** preserve the key/value pair in the AST (under a general
metadata map) and **MAY** emit a warning. This guarantees tool-specific metadata
(e.g. `ccli`, `youtube`, `difficulty`) can coexist.

### 5.7 Example

```cml
title "Amazing Grace"
artist "Traditional"
composer "John Newton"
key G
tempo 72
time_signature 3/4
copyright "Public Domain"
```

---

## 6. Sections

### 6.1 Overview

A **Section** is a named region of the song body. Sections give the song its
form (intro, verse, chorus, …). Everything after a `section` declaration, up to
the next `section` declaration or end of file, belongs to that section.

### 6.2 Syntax

A section is declared with the keyword `section` followed by a section name:

```cml
section Verse
```

The name may be a bare identifier (`Verse`, `Chorus`, `PreChorus`) or a quoted
string when it contains spaces or punctuation:

```cml
section "Verse 1"
section "Guitar Solo"
```

A section declaration **MUST** appear on its own line.

### 6.3 Optional Labels and Numbering

A section MAY carry an explicit numeric or textual label after the name, to
distinguish repeated section types:

```cml
section Verse 1
section Verse 2
section Chorus
```

Equivalently, authors MAY quote the whole label: `section "Verse 2"`. Processors
**MUST** accept both forms and normalize them to a `{ type, label }` pair in the
AST (e.g. `{ "type": "Verse", "label": "2" }`).

### 6.4 Implicit Leading Section

Measures that appear **before** any `section` declaration form an **implicit
section** whose `type` is `null` (an unnamed section). This allows the minimal
document `| C | F | G | C |` to be valid with no section declared.

### 6.5 Case Sensitivity

Section **type names are case-insensitive for the purpose of matching the core
song-form vocabulary** ([Section 11](#11-song-form)). That is, `Verse`,
`verse`, and `VERSE` all map to the canonical form-type `Verse`.

However, processors **MUST preserve the author's original casing** in the AST
(e.g. in a `raw` field) so renderers can display the name exactly as written.
Custom (non-core) section names are likewise matched case-insensitively for
deduplication but preserved verbatim for display.

> **Rationale.** Case-insensitive matching prevents `Chorus` and `chorus` from
> being treated as two unrelated sections, while preserving casing keeps author
> intent for display and round-tripping.

### 6.6 Example

```cml
section Intro
| G | D | Em | C |

section Verse
| G | C | G | D |

section Chorus
| C | G | D | G |
```

---

## 7. Measures

Measures are the **primary element** of CML.

### 7.1 Measure Boundaries

Measures are delimited by the bar line character `|`. A sequence of measures is
written as a run of bar lines with content between them:

```cml
| C | F | G | C |
```

The above denotes four measures: `[C] [F] [G] [C]`.

Rules:

- A measure line **MUST** begin with `|` and content between consecutive `|`
  characters constitutes one measure.
- The leading `|` and trailing `|` are REQUIRED. The text `C | F` without
  surrounding bars is **not** a valid measure line.
- Multiple measure lines in succession continue the same section's measure
  stream.
- A single logical line MAY contain any number of measures; authors typically
  write four measures per line by convention, but this is **not** required.

### 7.2 Empty Measures

A measure containing no chord is an **empty measure**, written as whitespace
between two bar lines:

```cml
| C | | G | |
```

Here measures 2 and 4 are empty. An empty measure denotes "continue the previous
harmony / no new chord stated." Renderers **SHOULD** display an empty measure as
a blank bar (optionally with a repeat-bar glyph `%` per house style).

### 7.3 Multi-Chord Measures

A measure MAY contain more than one chord, separated by spaces:

```cml
| C G | Am F | C |
```

Measure 1 contains two chords (`C`, then `G`); measure 2 contains `Am` then `F`;
measure 3 contains `C`. Absent explicit durations ([Section 13](#13-rhythm-and-timing)),
the chords in a measure are assumed to **divide the measure equally** in source
order. Two chords ⇒ half the bar each; three chords ⇒ thirds; and so on.

### 7.4 Chord Spacing Rules

- One or more spaces separate chords within a measure. Runs of spaces are
  equivalent to a single space.
- Spaces immediately after the opening `|` and before the closing `|` are
  insignificant.
- Tabs are permitted and treated as spaces.
- A chord token **MUST NOT** contain an unescaped space; a space always ends the
  current chord token.

### 7.5 Bar-Line Variants (informative / reserved)

v0.1 recognizes the single bar line `|` as the only measure delimiter. The
following are **reserved** for a future revision and **SHOULD NOT** be used by
authors yet:

- `||` — a plain double bar / section divider.
- `|.` or `||.` — final bar line.

Repeat bar lines (`||:`, `:||`) are specified in [Section 9](#9-repeats) and are
**not** reserved — they are defined now.

### 7.6 Examples

```cml
| C | F | G | C |            # four single-chord measures
| C | | G | |                # measures 2 and 4 empty
| C G | Am F | C |           # multi-chord measures
| Cmaj7 | F#m7b5 | G7 | C |   # extended chord qualities
```

---

## 8. Chords

A **Chord** is a text token describing a harmony. CML adopts conventional
pop/jazz chord spelling.

### 8.1 Chord Grammar (informal)

A chord token is composed, in order, of:

```
<root> <accidental>? <quality/extensions>? ( "/" <bass-root> <bass-accidental>? )?
```

### 8.2 Root Notes

The root **MUST** be one of the seven letter names `A B C D E F G`
(upper-case). Lower-case roots are **not** valid in v0.1 (lower-case is reserved
to avoid ambiguity with potential future solfège/relative syntax).

### 8.3 Accidentals

An OPTIONAL accidental immediately follows the root:

- `#` — sharp
- `b` — flat

Examples: `F#`, `Bb`, `C#`, `Eb`. Double accidentals (`##`, `bb`) are
**reserved** and **SHOULD NOT** be used in v0.1.

### 8.4 Quality and Extensions

Following the root (and optional accidental), an OPTIONAL **quality/extension
string** describes the chord quality. CML parses this string **permissively**:
it is matched as a run of chord-quality characters and is not exhaustively
enumerated, so that future qualities do not break parsers.

Commonly used qualities include:

| Written   | Meaning (informative)            |
|-----------|----------------------------------|
| *(none)*  | major triad                      |
| `m`       | minor triad                      |
| `dim`     | diminished                       |
| `aug`     | augmented                        |
| `7`       | dominant seventh                 |
| `maj7`    | major seventh                    |
| `m7`      | minor seventh                    |
| `m7b5`    | half-diminished                  |
| `dim7`    | diminished seventh               |
| `6`       | major sixth                      |
| `m6`      | minor sixth                      |
| `9 11 13` | extended dominants               |
| `sus2`    | suspended second                 |
| `sus4`    | suspended fourth                 |
| `add9`    | added ninth                      |
| `maj9`    | major ninth                      |

The characters permitted in a quality/extension string are the ASCII letters,
digits, `+`, `-`, `#`, `b`, `(`, `)`, and `°`/`ø` (for diminished/
half-diminished). A processor **MUST** capture the full quality string
verbatim and **SHOULD NOT** reject qualities it does not semantically
understand.

### 8.5 Slash Chords (Inversions / Alternate Bass)

A slash chord specifies a bass note distinct from the root using `/`:

```
G/B      # G major over a B bass
D/F#     # D major over an F# bass
C/E      # C major over an E bass
```

The text after `/` is itself a root + optional accidental. Only a single `/`
bass is permitted per chord in v0.1.

### 8.6 Rests / No-Chord

The token `N.C.` (no chord) **MAY** be used in place of a chord to indicate a
deliberate absence of harmony (as opposed to an empty measure, which means
"continue"). Processors **SHOULD** recognize `N.C.` and `NC` as a no-chord
marker.

### 8.7 Examples

```
C
Cm
C7
Cmaj7
Csus4
Cadd9
F#m
Bbmaj7
G/B
```

### 8.8 Future Compatibility

The following are reserved for future revisions and out of scope for v0.1:

- Nashville Number System tokens (`1 4 5`, `6m`) — see roadmap.
- Roman numeral analysis tokens (`I`, `ii`, `V7`) — see roadmap.
- Explicit chord-voicing / fingering data.

Because the quality string is parsed permissively, documents using
not-yet-standardized qualities will still parse; semantics are simply
tool-defined until standardized.

---

## 9. Repeats

Repeats are **first-class** constructs. CML does not express repetition in prose.

### 9.1 Syntax

A repeated span is opened with `||:` and closed with `:||`. (Mnemonic: the
colon "dots" sit on the side facing the repeated music, matching staff notation.
The opener's dots face right, into the span; the closer's dots face left, into
the span.) The span contains ordinary measures:

```cml
||: C | F | G | C :||
```

This denotes: play the measures `C | F | G | C`, then repeat them. With no
explicit count, the default is **two total passes** (play once, repeat once).

### 9.2 Explicit Repeat Count

An explicit repeat count is given with `xN` (or `xN`) immediately after the
closing `:||`:

```cml
||: C | F | G | C :|| x4
```

`x4` means **four total passes** of the enclosed measures. The count `N` **MUST**
be an integer ≥ 1. `x1` is legal and means "play once" (no actual repeat); it is
permitted for generated output and explicitness.

### 9.3 Placement

- A repeat group **MUST** be fully contained within a single section (it
  **MUST NOT** span a `section` boundary).
- Repeat groups **MUST NOT** nest in v0.1. Nested repeats are **reserved**.
- A repeat group MAY be preceded and followed by ordinary measures in the same
  section.

### 9.4 Parser Behavior

A conforming processor **MUST**:

1. Recognize `||:` as "repeat-start" and `:||` as "repeat-end" tokens.
2. Collect the measures between them into a single `RepeatGroup` node.
3. Attach the repeat count: the integer from a trailing `xN` if present,
   otherwise the default value `2`.
4. Report an error if a `||:` has no matching `:||` before end of section/file
   (see [Section 18](#18-validation-rules)), or if `:||` appears with no open
   repeat.

When producing the expanded Arrangement
([Section 17.4](#174-arrangement-expansion)), the processor **MUST** emit the
enclosed measures `count` times (subject to alternate endings, Section 10).

### 9.5 Examples

```cml
||: C | F | G | C :||          # play twice (default)
||: C | F | G | C :|| x4       # play four times
section Chorus
| C | G |
||: Am | F :|| x3              # repeat group preceded by two measures
| C |
```

---

## 10. Alternate Endings

Alternate endings (voltas) allow a repeated span to finish differently on
different passes.

### 10.1 Syntax

An ending is introduced by a bracketed ordinal marker `[N]` where `N` is the
pass number on which that ending applies. Endings appear at the **end of a
repeat group**, before the closing `:||`:

```cml
||: G | C | G |
   [1] D | G |
   [2] C | G :||
```

- `[1]` marks the **first ending**, played only on pass 1.
- `[2]` marks the **second ending**, played only on pass 2 (and is typically the
  final pass).

An ending marker `[N]` applies to the measures following it, up to the next
ending marker or the repeat close `:||`.

### 10.2 Multiple Passes

An ending MAY list multiple applicable passes with a comma or range:

Example A: a three-pass repeat where the first ending covers passes 1 and 2,
and the second covers pass 3:

```cml
section Verse
||: G | C | G | D |
   [1,2] G | D |
   [3] G | C :|| x3
```

Expanded Arrangement (3 passes):

```
Pass 1: || G | C | G | D | G | D ||
Pass 2: || G | C | G | D | G | D ||
Pass 3: || G | C | G | D | G | C ||
```

Example B: a four-pass repeat where the first ending covers passes 1 through 3,
and the second covers pass 4:

```cml
section Chorus
||: C | F | G | C |
   [1-3] G | G |
   [4] G | C :|| x4
```

Expanded Arrangement (4 passes):

```
Pass 1: || C | F | G | C | G | G ||
Pass 2: || C | F | G | C | G | G ||
Pass 3: || C | F | G | C | G | G ||
Pass 4: || C | F | G | C | G | C ||
```

`[1,2]` applies on passes 1 and 2; `[1-3]` applies on passes 1 through 3.
The final ending with the highest number is played on the last pass.

### 10.3 Semantics

On pass *k*, the performer plays the common (pre-ending) measures of the repeat
group, then the ending whose set of applicable passes contains *k*. If exactly
one ending applies, it is used; if none explicitly applies to the final pass,
the ending with the largest number is used. Processors **MUST** reflect this in
the expanded Arrangement.

### 10.4 Validation

- Ending markers **MUST** appear inside a repeat group.
- Ending numbers **SHOULD** be contiguous starting from 1; a gap (e.g. `[1]`
  then `[3]`) **SHOULD** produce a warning.
- The number of distinct endings **SHOULD NOT** exceed the repeat count.

### 10.5 Example

```cml
section Verse
||: G | Em | C | D |
   [1] G | D |
   [2] G | C :|| x2
```

---

## 11. Song Form

### 11.1 Core Section Types

CML defines a **core vocabulary** of section types with well-known meaning.
These are matched case-insensitively ([Section 6.5](#65-case-sensitivity)):

| Canonical type | Common aliases (case-insensitive) |
|----------------|-----------------------------------|
| `Intro`        | `intro` |
| `Verse`        | `verse` |
| `PreChorus`    | `pre-chorus`, `prechorus`, `pre chorus` |
| `Chorus`       | `chorus` |
| `Bridge`       | `bridge` |
| `Solo`         | `solo`, `instrumental` |
| `Outro`        | `outro`, `ending` |

> Note: multi-word aliases such as `pre chorus` are only recognized when quoted:
> `section "Pre Chorus"`. Unquoted, `section PreChorus` or `section Pre-Chorus`
> are the idiomatic forms.

### 11.2 Custom Sections

Authors and tools **MAY** define **custom section names** beyond the core
vocabulary (e.g. `Interlude`, `Vamp`, `Tag`, `Refrain`, `"Coda Section"`,
`Turnaround`, `Pallavi`, `"Anu Pallavi"`, `Charanam`). A custom name is any valid section name not in the core
vocabulary. Processors **MUST** accept custom sections, record their `type` as
the author-provided (normalized) name, and mark them as non-core (e.g. a
`core: false` flag in the AST).

Renderers **SHOULD** display core and custom section names identically; the
core/custom distinction exists for tooling (e.g. auto-generating a structure
summary), not for presentation.

### 11.3 Repeated Section Types

The same section type MAY appear multiple times (two verses, three choruses).
Labels ([Section 6.3](#63-optional-labels-and-numbering)) disambiguate them for
display and navigation.

---

## 12. Lyrics

Because CML is measure-first, lyrics are **optional, secondary data** aligned to
the measure stream. This section explores several candidate syntaxes, compares
them, and recommends **one canonical approach**.

### 12.1 Requirements

A lyric syntax for CML should:

- Keep lyrics **optional** and visually separable from the chord/measure stream.
- Allow lyrics to be aligned at least to the **measure** level, and ideally to
  **positions within** a measure (per chord).
- Not compromise the measure-first readability of the chord line.
- Be easy to type and unambiguous to parse.

### 12.2 Option A — Paired Lyric Line (chord line + `>` lyric line)

A lyric line immediately follows a measure line and begins with a `>` sigil.
Text is aligned to measures positionally by splitting on `|`:

```cml
| G        | C      | G       | D     |
> A- ma-   | zing   | grace   | how   |
```

**Pros:** visually aligned; easy to see which words fall under which bar.
**Cons:** requires the author to maintain column alignment (fragile with
proportional fonts and when editing); whitespace becomes meaningful.

### 12.3 Option B — Inline Lyrics After Chords

Lyrics are attached to individual chords inline using a quoted string:

```cml
| G "A-ma-" C "zing" | G "grace" | D "how" |
```

**Pros:** precise per-chord alignment; robust to reformatting.
**Cons:** clutters the measure line; harms the "pure structure" readability that
is CML's main advantage; hard to read a long verse.

### 12.4 Option C — Separate `lyrics` Block Per Section

Each section MAY carry a dedicated `lyrics` block whose lines correspond, in
order, to the measure lines of the section. Alignment is by **measure index**,
using `|` as the per-measure separator but **without** requiring column
alignment:

```cml
section Verse
| G | C | G | D |
lyrics
| A-ma- | zing | grace, how | sweet |
```

**Pros:** keeps the chord stream pristine; lyrics are clearly optional and
grouped; alignment is by bar, not by column, so it survives reformatting;
trivial to parse (split each lyric line on `|`).
**Cons:** author must keep the number of `|`-separated lyric cells in step with
the measures (a validation warning can catch mismatches).

### 12.5 Comparison

| Criterion                     | A (`>` line) | B (inline) | C (`lyrics` block) |
|-------------------------------|:------------:|:----------:|:------------------:|
| Keeps chord stream readable   | ⚠︎ partial   | ✗          | ✓                  |
| Robust to reformatting        | ✗            | ✓          | ✓                  |
| Easy to type                  | ⚠︎           | ✗          | ✓                  |
| Per-chord precision           | ⚠︎           | ✓          | ⚠︎ per-bar         |
| Easy to parse                 | ⚠︎ (columns) | ✓          | ✓                  |
| Lyrics clearly optional       | ✓            | ✗          | ✓                  |

### 12.6 Recommended Canonical Approach

**CML adopts Option C (the per-section `lyrics` block) as the canonical lyric
syntax for v0.1.** It best preserves the measure-first, structure-first design,
keeps lyrics obviously optional, parses trivially (split on `|`), and is robust
to editing.

Rules for the canonical form:

1. A `lyrics` block is introduced by the keyword `lyrics` on its own line,
   inside a section, after the measure line(s) it annotates.
2. Each lyric line is a `|`-delimited sequence of **cells**; the *k*-th cell
   aligns to the *k*-th measure of the corresponding measure line.
3. A cell MAY be empty (an unsung bar). Leading/trailing whitespace in a cell is
   trimmed.
4. The number of cells **SHOULD** equal the number of measures it annotates; a
   mismatch **SHOULD** yield a warning, not a fatal error.
5. Hyphens within a word (`A-ma-zing`) denote syllable breaks for renderers that
   do syllabic layout; renderers that do not **SHOULD** display hyphens as
   written or join them per house style.

Per-chord precision (Option B) is **reserved** as an OPTIONAL future extension
for tools that need karaoke-grade alignment; it does not replace Option C.

### 12.7 Example

```cml
section Verse
| G | G7 | C | G |
lyrics
| A-ma-zing | grace, how | sweet the | sound |
| G | Em | D |
lyrics
| that saved | a wretch like | me |
```

---

## 13. Rhythm and Timing

> **Status: partly experimental.** The equal-division default (13.1) is
> normative. The explicit-duration syntax (13.2–13.4) is **RECOMMENDED but
> marked experimental** for v0.1; its exact token form MAY change before v1.0.

### 13.1 Default: Equal Division

Absent explicit durations, the chords within a measure divide the bar equally in
source order ([Section 7.3](#73-multi-chord-measures)). This covers the majority
of lead-sheet cases and requires no extra syntax.

### 13.2 Explicit Beat Durations

A chord MAY be annotated with an explicit duration in **beats** using a
parenthesized integer immediately after the chord token:

```cml
| C(2) F(2) |
```

Here `C` lasts 2 beats and `F` lasts 2 beats. The unit is one beat as defined by
the prevailing `time_signature` denominator (e.g. a quarter note in `4/4`).

### 13.3 Mixed Durations

```cml
| C(1) G(1) Am(2) |
```

`C` for 1 beat, `G` for 1 beat, `Am` for 2 beats (total 4 beats, filling a `4/4`
bar).

### 13.4 Validation of Durations

- If any chord in a measure carries an explicit duration, processors
  **SHOULD** check that the sum of durations in that measure equals the bar
  length implied by the `time_signature` (numerator). A mismatch **SHOULD**
  produce a warning (the bar may be intentionally incomplete — a pickup — so it
  is not a fatal error).
- Chords without an explicit duration in a measure that also contains explicitly
  durated chords **SHOULD** be flagged (mixed explicit/implicit is ambiguous);
  tools MAY distribute the remaining beats equally among un-durated chords.

### 13.5 Subdivisions (experimental)

Fractional / subdivided durations are **experimental** and reserved. Two
candidate notations are noted here for future standardization and **SHOULD NOT**
be relied upon in v0.1:

- Fractional beats: `C(0.5)` — half a beat.
- Dotted/relative tokens: `C(.)`, `C(..)` — tool-defined.

Processors encountering experimental duration syntax **SHOULD** parse it into a
raw duration field and emit an "experimental feature" warning rather than
failing.

### 13.6 Examples

```cml
time_signature 4/4
| C(2) F(2) |            # two half-bar chords
| C(1) G(1) Am(2) |      # 1 + 1 + 2 = 4 beats
| C F |                  # equal division (implicit 2 + 2)
```

---

## 14. Navigation Constructs

> **Status: reserved for a future revision.** This section specifies the
> *intended* syntax and semantics so parser authors can plan for it. Processors
> targeting v0.1 **MAY** recognize these tokens and place them in the AST as
> opaque navigation markers, but full jump-resolution semantics are **not
> required** for v0.1 conformance.

### 14.1 Markers and Jumps

Common Western navigation constructs and their intended CML spelling:

| Construct | Intended token | Role |
|-----------|----------------|------|
| Segno     | `%segno`       | A named target (the "sign"). |
| Coda      | `%coda`        | A named target (the "coda"/tail). |
| To Coda   | `%to-coda`     | Jump instruction to the coda on the final pass. |
| Da Capo   | `%dc` (D.C.)   | Return to the beginning. |
| Dal Segno | `%ds` (D.S.)   | Return to the most recent `%segno`. |
| Fine      | `%fine`        | Marks the end point for a D.C./D.S. al Fine. |

The `%` sigil is reserved for navigation markers so they are lexically distinct
from chords, measures, and sections.

### 14.2 Placement

Navigation markers appear **between measures** or on their own line within a
section:

```cml
section Verse
%segno
| G | C | G | D |
%to-coda
| G | D |

section Chorus
| C | G | D | G |
%dc-al-coda          # D.C. al Coda: back to top, then jump to coda

%coda
| G |
```

### 14.3 Semantics (intended)

When expanding the Arrangement, a processor that implements navigation
**MUST** resolve jumps in the conventional order:

1. Play through source order.
2. On reaching `%dc`/`%ds`, jump to the beginning / most recent `%segno`.
3. On the repeat pass, honor `%to-coda` by jumping to the `%coda` target.
4. Stop at `%fine` when performing an *al Fine* return.

Because these interact subtly with repeats and endings, full semantics are
deferred to a dedicated revision ([Section 21](#21-versioning-strategy)). Until
then, markers are preserved in the AST but **MAY** be ignored during expansion.

---

## 15. Comments

### 15.1 Line Comments

A comment begins with `#` and continues to the end of the line. Everything from
`#` to the line terminator is ignored by the processor:

```cml
# This is a whole-line comment
| C | F | G | C |   # trailing comment after a measure line
```

### 15.2 Rules

- `#` **MUST NOT** be treated as a comment when it appears as an accidental
  inside a chord token (e.g. `F#m`, `G/F#`). A `#` is a comment introducer only
  when it is **not part of a chord token** — i.e. when preceded by whitespace or
  at the start of a line.
- There is no block/multi-line comment syntax in v0.1; each comment line
  **MUST** begin its comment with `#`.
- Comments inside quoted strings are not comments (the `#` is literal text).

### 15.3 Processor Behavior

Comments **MUST** be stripped before semantic parsing but **MAY** be preserved
in the AST (e.g. attached to the following node) by tools that round-trip source.

---

## 16. Formal Grammar

The following EBNF defines CML v0.1. It is written in a conventional EBNF
dialect:

- `"..."` denotes a literal terminal.
- `|` denotes alternation (in the grammar meta-language, not the CML bar line,
  which is written as the terminal `"|"`).
- `{ X }` denotes zero or more repetitions of `X`.
- `[ X ]` denotes an optional `X`.
- `( ... )` groups.
- Lexical rules use character classes like `"A".."G"`.

### 16.1 Lexical Grammar

```ebnf
Newline        = "\n" | "\r\n" ;
Space          = " " | "\t" ;
Spaces         = Space { Space } ;
OptSpaces      = { Space } ;

Digit          = "0".."9" ;
Integer        = Digit { Digit } ;

Letter         = "A".."Z" | "a".."z" ;
IdentStart     = Letter | "_" ;
IdentChar      = Letter | Digit | "_" | "-" ;
Identifier     = IdentStart { IdentChar } ;

QuotedString   = '"' { StringChar } '"' ;
StringChar     = AnyCharExceptQuoteOrNewline | '\\"' ;

Comment        = "#" { AnyCharExceptNewline } ;
```

### 16.2 Document Structure

```ebnf
Document       = { BlankOrComment }
                 { MetadataLine }
                 Body
                 { BlankOrComment } ;

BlankOrComment = OptSpaces [ Comment ] Newline ;

Body           = { Section | SectionlessBlock } ;

(* A leading run of measure/structure content before any `section`
   declaration forms the implicit (unnamed) section. *)
SectionlessBlock = Element { Element } ;
```

### 16.3 Metadata Rules

```ebnf
MetadataLine   = OptSpaces MetaKey Spaces MetaValue OptSpaces
                 [ Comment ] Newline ;

MetaKey        = Identifier ;                     (* case-insensitive *)
MetaValue      = QuotedString | BareValue ;
BareValue      = BareChar { BareChar } ;
BareChar       = ? any non-space, non-newline character except '"' and '#' ? ;
```

> A line is parsed as a `MetadataLine` only if its first non-space character is
> not `|` and the first token is a known/identifier key followed by a value.
> Implementations typically distinguish metadata from measures by the leading
> `|`.

### 16.4 Section Rules

```ebnf
Section        = SectionHeader { Element } ;

SectionHeader  = OptSpaces "section" Spaces SectionName
                 [ Spaces SectionLabel ] OptSpaces [ Comment ] Newline ;

SectionName    = Identifier | QuotedString ;
SectionLabel   = Integer | QuotedString | Identifier ;

Element        = MeasureLine
               | RepeatGroup
               | LyricsBlock
               | NavigationLine        (* reserved; see Section 14 *)
               | BlankOrComment ;
```

### 16.5 Measure Rules

```ebnf
MeasureLine    = OptSpaces "|" MeasureSeq OptSpaces [ Comment ] Newline ;

MeasureSeq     = Measure "|" { Measure "|" } ;

Measure        = OptSpaces [ ChordList ] OptSpaces ;

ChordList      = ChordItem { Spaces ChordItem } ;

ChordItem      = NoChord | Chord [ Duration ] ;

NoChord        = "N.C." | "NC" ;

Duration       = "(" DurationValue ")" ;
DurationValue  = Integer [ "." Integer ] ;   (* fractional = experimental *)
```

### 16.6 Chord Rules

```ebnf
Chord          = Root [ Accidental ] [ Quality ] [ "/" Bass ] ;

Root           = "A" | "B" | "C" | "D" | "E" | "F" | "G" ;
Accidental     = "#" | "b" ;

Bass           = Root [ Accidental ] ;

Quality        = QualityChar { QualityChar } ;
QualityChar    = Letter | Digit | "+" | "-" | "#" | "b"
               | "(" | ")" | "°" | "ø" ;
```

### 16.7 Repeat and Ending Rules

```ebnf
RepeatGroup    = RepeatStart
                 { MeasureLine | BlankOrComment }
                 { Ending }
                 RepeatEnd [ RepeatCount ]
                 OptSpaces [ Comment ] Newline ;

RepeatStart    = OptSpaces "||:" ;
RepeatEnd      = ":||" ;
RepeatCount    = Spaces ( "x" | "X" ) Integer ;

Ending         = OptSpaces EndingMarker MeasureSeqInline ;
EndingMarker   = "[" PassSpec "]" ;
PassSpec       = PassItem { "," PassItem } ;
PassItem       = Integer [ "-" Integer ] ;       (* single or range *)

MeasureSeqInline = { OptSpaces [ ChordList ] OptSpaces "|" } ;
```

> Note: `RepeatStart` and `RepeatEnd` are shown here on a conceptual single
> construct. In practice a repeat group MAY be written across multiple physical
> lines (opening `||:` … measures … `:|| xN`). Implementations tokenize `||:`,
> `:||`, and `xN` and treat the intervening measures as the group body.

### 16.8 Lyrics Rules

```ebnf
LyricsBlock    = OptSpaces "lyrics" OptSpaces [ Comment ] Newline
                 LyricLine { LyricLine } ;

LyricLine      = OptSpaces "|" LyricCellSeq OptSpaces Newline ;
LyricCellSeq   = LyricCell "|" { LyricCell "|" } ;
LyricCell      = { ? any character except "|" and newline ? } ;
```

### 16.9 Navigation Rules (reserved)

```ebnf
NavigationLine = OptSpaces NavMarker OptSpaces [ Comment ] Newline ;
NavMarker      = "%segno" | "%coda" | "%to-coda"
               | "%dc" | "%ds" | "%fine"
               | "%dc-al-coda" | "%ds-al-coda"
               | "%dc-al-fine" | "%ds-al-fine" ;
```

---

## 17. Abstract Syntax Tree (AST)

### 17.1 Overview

A conforming processor produces an AST that captures the Song in **source
order**. This section defines a canonical JSON serialization of that AST. The
JSON form is the recommended interchange format between CML tools.

### 17.2 Node Types

Top-level shape:

```
Song {
  cmlVersion: string
  metadata:   { [key: string]: string | number }   // normalized keys
  sections:   Section[]
}

Section {
  type:  string | null        // canonical core type, custom name, or null (implicit)
  label: string | null
  core:  boolean              // true if `type` is in the core vocabulary
  raw:   string | null        // author's original name as written
  elements: Element[]
}

Element = Measure | RepeatGroup | NavigationMarker

Measure {
  kind: "measure"
  chords: Chord[]             // empty array => empty/continue measure
  lyrics?: string[]           // per-chord or per-measure lyric cells (optional)
}

Chord {
  kind: "chord"
  root:    string             // "A".."G"
  accidental: "#" | "b" | null
  quality: string | null      // verbatim quality/extension string
  bass:    { root: string, accidental: "#" | "b" | null } | null
  duration: number | null     // beats, if explicit
  noChord: boolean            // true for N.C.
  raw:     string             // original token, e.g. "F#m7b5"
}

RepeatGroup {
  kind: "repeat"
  count: number               // total passes (default 2)
  body:  Measure[]
  endings?: Ending[]
}

Ending {
  passes: number[]            // e.g. [1] or [1,2]
  body:   Measure[]
}

NavigationMarker {            // reserved
  kind: "nav"
  marker: string              // "segno" | "coda" | "dc" | ...
}
```

### 17.3 Worked Example

**Input:**

```cml
title "Amazing Grace"

section Verse

||: G | C | G | D :|| x2
```

**Canonical JSON AST:**

```json
{
  "cmlVersion": "0.1",
  "metadata": {
    "title": "Amazing Grace"
  },
  "sections": [
    {
      "type": "Verse",
      "label": null,
      "core": true,
      "raw": "Verse",
      "elements": [
        {
          "kind": "repeat",
          "count": 2,
          "body": [
            {
              "kind": "measure",
              "chords": [
                { "kind": "chord", "root": "G", "accidental": null,
                  "quality": null, "bass": null, "duration": null,
                  "noChord": false, "raw": "G" }
              ]
            },
            {
              "kind": "measure",
              "chords": [
                { "kind": "chord", "root": "C", "accidental": null,
                  "quality": null, "bass": null, "duration": null,
                  "noChord": false, "raw": "C" }
              ]
            },
            {
              "kind": "measure",
              "chords": [
                { "kind": "chord", "root": "G", "accidental": null,
                  "quality": null, "bass": null, "duration": null,
                  "noChord": false, "raw": "G" }
              ]
            },
            {
              "kind": "measure",
              "chords": [
                { "kind": "chord", "root": "D", "accidental": null,
                  "quality": null, "bass": null, "duration": null,
                  "noChord": false, "raw": "D" }
              ]
            }
          ],
          "endings": []
        }
      ]
    }
  ]
}
```

### 17.4 Arrangement Expansion

The **Arrangement** is the source AST expanded into performance order:

- Each `RepeatGroup` is unrolled `count` times.
- On pass *k*, the common body is followed by the matching `Ending` (if any).
- Navigation markers (when implemented) further reorder passes.

Producing the Arrangement is **RECOMMENDED**. A minimal Arrangement is a flat
`Measure[]`. For the example above, the Arrangement is:

```
[ G, C, G, D,   G, C, G, D ]   // two passes
```

---

## 18. Validation Rules

A conforming processor **MUST** detect the following classes of problems. Each
is classified as an **error** (invalid document; processing MAY stop) or a
**warning** (document is usable; processor continues).

| # | Condition | Severity | Notes |
|---|-----------|----------|-------|
| V1 | `section` keyword with no following name | **error** | Missing section name (e.g. `section` on a line alone). |
| V2 | Repeat start `||:` with no matching `:||` in the section | **error** | Unclosed repeat. |
| V3 | Repeat end `:||` with no preceding `||:` | **error** | Dangling repeat close. |
| V4 | Repeat count `xN` with `N < 1` or non-integer | **error** | Invalid repeat count. |
| V5 | Measure line not starting/ending with `|` | **error** | Malformed measure boundaries. |
| V6 | Invalid chord root (not `A`–`G`) | **error** | e.g. `H`, `c`. |
| V7 | Ending marker `[N]` outside a repeat group | **error** | Voltas only inside repeats. |
| V8 | Repeat group spanning a `section` boundary | **error** | Repeats MUST be section-local. |
| V9 | Nested repeat groups | **error** | Reserved; not allowed in v0.1. |
| V10 | Unknown metadata key | **warning** | Preserve, do not fail (§5.6). |
| V11 | Unknown chord quality string | **warning** | Preserve verbatim (§8.4). |
| V12 | Lyric cell count ≠ measure count | **warning** | Alignment mismatch (§12.6). |
| V13 | Sum of explicit durations ≠ bar length | **warning** | May be a pickup bar (§13.4). |
| V14 | Non-contiguous ending numbers (gap) | **warning** | e.g. `[1]` then `[3]`. |
| V15 | Experimental syntax used (fractional durations, nav markers) | **warning** | Mark as experimental (§13.5, §14). |
| V16 | `key` and `scale` both present with different values | **error** | Conflicting tonal key (§5.4.1). |

### 18.1 Error Reporting

Processors **SHOULD** report, for each diagnostic: the severity, a stable
machine-readable code (e.g. `V2`), a human-readable message, and the source
line/column where the problem was detected.

### 18.2 Recovery

For warnings, the processor **MUST** continue and produce a best-effort AST. For
errors, the processor **MAY** either stop at the first error or continue in a
recovery mode that collects multiple errors; collecting multiple errors is
**RECOMMENDED** for editor integrations.

---

## 19. Rendering Recommendations

These recommendations guide renderers (HTML, PDF, mobile, worship software) to a
consistent presentation. They are **RECOMMENDED**, not mandatory; house styles
MAY vary.

### 19.1 Measures

- Render each measure as a cell bounded by vertical bar lines, preserving source
  grouping (commonly four measures per row).
- An **empty measure** SHOULD render as a blank bar; a repeat-bar glyph (`%`)
  MAY be used per house style.
- Multi-chord measures SHOULD space chords evenly (or per explicit durations,
  §13) within the bar.

### 19.2 Chords

- Render the chord `raw` text by default. Renderers MAY re-spell qualities to a
  house convention (e.g. `-7` → `m7`, `Δ` for `maj7`) but SHOULD offer a mode
  that preserves the author's spelling.
- Slash chords SHOULD render the bass after a visible slash: `G/B`.
- Superscript rendering of extensions (`C^maj7`) is a stylistic choice.

### 19.3 Repeats

- Render repeat spans with standard repeat bar lines and show the repeat count
  (e.g. "×2") when `count > 2` or when explicitly specified.
- Alternate endings SHOULD render as numbered brackets (voltas) above their
  measures.

### 19.4 Sections

- Render the section name/label as a heading above its measures.
- Preserve author casing (`raw`) for display.
- Core vs. custom sections SHOULD look identical; the distinction is for tooling.

### 19.5 Lyrics

- When a `lyrics` block is present, render each cell beneath its aligned
  measure.
- Respect syllable hyphens for syllabic layout where supported; otherwise render
  hyphens as written.
- When no lyrics are present, render a pure chord chart with no empty lyric rows.

### 19.6 Transposition (informative)

Because chords are fully parsed (root + accidental + quality + bass), renderers
MAY offer transposition and capo-aware display. Transposition operates on `root`
and `bass` while preserving `quality`. This is an application feature, not a
language feature.

---

## 20. Examples

### Example 1 — Simple Chord Progression

```cml
| C | F | G | C |
```

A single, unnamed (implicit) section containing four measures.

### Example 2 — Verse and Chorus

```cml
title "Simple Song"
key C

section Verse
| C | Am | F | G |
| C | Am | F | G |

section Chorus
| F | C | G | C |
| F | C | G | C |
```

### Example 3 — Repeat Structures (with an alternate ending)

```cml
title "Repeat Demo"
key G

section Verse
||: G | Em | C | D |
   [1] G | D |
   [2] G | C :|| x2

section Chorus
||: C | G | D | G :|| x4
```

### Example 4 — Song With Metadata

```cml
title "Amazing Grace"
artist "Traditional"
composer "John Newton"
key G
tempo 72
time_signature 3/4
copyright "Public Domain"

section Verse
| G | G7 | C | G |
| G | Em | D | D7 |
| G | G7 | C | G |
| G | D | G | G |
```

### Example 5 — Song With Lyrics

```cml
title "Amazing Grace"
artist "Traditional"
key G
tempo 72
time_signature 3/4

section Verse
| G | G7 | C | G |
lyrics
| A-ma-zing | grace, how | sweet the | sound |
| G | Em | D |
lyrics
| that saved | a wretch like | me |
| G | G7 | C | G |
lyrics
| I once was | lost, but | now am | found |
| G | D | G |
lyrics
| was blind, but | now I | see |
```

---

## 21. Versioning Strategy

CML uses a `MAJOR.MINOR` version scheme, with draft qualifiers before 1.0.

### 21.1 Draft Versions

Versions prior to `1.0` are **drafts** (e.g. `0.1 Draft`, `0.2 Draft`). Draft
versions **MAY** make breaking changes between releases. Experimental features
(e.g. rhythm subdivisions, navigation semantics) are introduced and refined in
drafts and are explicitly labelled **experimental**.

### 21.2 Minor Versions

After `1.0`, a **minor** version increment (`1.0` → `1.1`) adds features in a
**backward-compatible** way: any document valid under `1.x` **MUST** remain
valid and semantically unchanged under `1.y` for `y > x`. New optional
constructs, new metadata keys, and new chord qualities are typical minor-version
additions.

### 21.3 Major Versions

A **major** version increment (`1.x` → `2.0`) MAY introduce breaking changes.
Breaking changes **MUST** be documented with a migration guide. Processors
**SHOULD** honor a document's declared `version` and reject or warn on documents
targeting a newer major version than they implement.

### 21.4 Backward Compatibility Principles

- Unknown metadata keys and chord qualities are preserved, not errors (§5.6,
  §8.4) — this is the primary forward-compatibility mechanism.
- Reserved sigils (`@`, `!`, `*`, `%`) ensure future directives will not collide
  with existing author syntax.
- The `cmlVersion` field in the AST records which spec version produced it.

---

## 22. Future Roadmap

The following features are **out of scope for v0.1** and are recorded here to
guide the language's evolution. None of these is guaranteed; they represent
intended directions.

### 22.1 Nashville Number System

Allow chords to be written as scale degrees relative to the key (`1 4 5 6m`),
enabling key-independent charts. Requires a degree token type distinct from
letter-named chords and interacts with the `key` metadata for rendering.

### 22.2 Roman Numeral Analysis

Support harmonic-analysis notation (`I`, `ii`, `V7`, `vi`) as an alternative or
parallel representation, useful for pedagogy and theory tooling.

### 22.3 Chord Diagrams

Attach or define fretboard/keyboard diagrams for chords (fingerings, barre
positions), enabling songbooks and apps to print chord shapes.

### 22.4 Guitar Tablature

An OPTIONAL tablature layer (string/fret per position) attached to measures, for
riffs and intros where exact fingering matters.

### 22.5 Multiple Lyric Languages

Allow several `lyrics` blocks per section, each tagged with a language
(`lyrics en`, `lyrics es`), for multilingual songbooks and worship contexts.

### 22.6 MIDI Integration

Define a deterministic mapping from the expanded Arrangement (with rhythm and
tempo) to MIDI events for playback and practice tools.

### 22.7 MusicXML Interoperability

Specify a lossy-but-faithful conversion between CML and the harmony/structure
subset of MusicXML, enabling import/export with notation software.

### 22.8 JSON Serialization

The canonical AST JSON (§17) is the foundation for a stable, versioned JSON
interchange schema (`cml.schema.json`), to be published alongside the spec so
that tools can validate AST documents directly.

### 22.9 Full Navigation Semantics

Promote the navigation constructs of §14 from reserved to fully specified,
including their precise interaction with repeats and alternate endings during
Arrangement expansion.

### 22.10 Per-Section Meter and Key Changes

Allow `time_signature` and `key` to be overridden within a section, supporting
songs with mid-piece modulations and metric changes.

---

## Appendix A. Terminology and Synonyms

Musicians use different terms for the same concept, and some terms differ by
convention or by region. This appendix lists the equivalent terms that CML
accepts or recognizes, and states which term the specification uses. Every
term in the "Equivalent terms" column has the same meaning as the canonical
term in the first column.

### A.1 Structural Terms

| Canonical term (CML) | Equivalent terms | CML treatment |
|----------------------|------------------|---------------|
| Measure              | Bar              | Synonyms. The `\|` character is the bar line that delimits a measure (§7.1). |
| Bar line             | Barline          | Same concept. CML uses "bar line" for the `\|` character. |
| Meter                | Time signature   | Synonyms. The metadata key is `time_signature` (§5.5). |
| Repeat               | Repeat sign, Repeat bar | Same concept. Delimited by `:\|\|` and `\|\|:` (§9). |
| Alternate ending     | Volta, 1st/2nd ending | Same concept. Written as `[N]` (§10). |
| Pickup (anacrusis)   | Anacrusis, Upbeat | Partial bar at the start of a phrase. Pickup bars are permitted (§13.4). |
| Section              | Part                | Named region of the song body (§6). |
| Lyrics               | Words, Text         | Optional text aligned to measures (§12). |

### A.2 Metadata Terms

| Canonical term (CML) | Equivalent terms | CML treatment |
|----------------------|------------------|---------------|
| `key`                | `scale`          | Synonyms. `scale` is normalized to `key` (§5.4.1). |
| Tonic                | Key root, Tonal center | The root note of the key, such as `G` in `key G` (§5.4). |
| `tempo`              | BPM, Beats per minute | `tempo` is the integer BPM value (§5.3). |
| `capo`               | Capo position        | Fret number of the capo (§5.3). |

### A.3 Chord Terms

| Canonical term (CML) | Equivalent terms | CML treatment |
|----------------------|------------------|---------------|
| Quality              | Chord type, Chord extension | The quality string after the root (§8.4). |
| Minor (`m`)          | `-` (e.g. `C-7`)  | `-` is a valid quality character (§8.4), but CML uses `m` as the canonical form. |
| Major seventh        | `M7`              | Canonical form is `maj7` (§8.4). `M7` is accepted as a quality string. `Δ` is not accepted in v0.1. |
| Half-diminished      | `ø`, `ø7`         | `m7b5` is canonical. `ø` is accepted as a quality character (§8.4). |
| Diminished           | `°`               | `dim` is canonical. `°` is accepted as a quality character (§8.4). |
| Sharp                | `#`               | `#` is the only sharp character in v0.1 (§8.3). |
| Flat                 | `b`               | `b` is the only flat character in v0.1 (§8.3). |
| Slash chord          | Bass chord, Inversion | Chord with a bass note after `/` (§8.5). |
| No chord             | `N.C.`, `NC`      | Both are recognized (§8.6). |
| Root                 | Chord letter, Chord name | Letter `A` through `G` (§8.2). |

### A.4 Rhythm Terms

| Canonical term (CML) | Equivalent terms | CML treatment |
|----------------------|------------------|---------------|
| Beat                 | Count, Pulse     | The unit of duration in explicit duration syntax (§13.2). |
| Equal division       | Even spacing     | Default chord timing in a measure (§13.1). |

### A.5 Song Form Terms

| Canonical term (CML) | Equivalent terms | CML treatment |
|----------------------|------------------|---------------|
| `PreChorus`          | Pre-chorus, Prechorus, Pre chorus | All recognized (§11.1). Quoted form for spaces. |
| `Solo`               | Instrumental     | Both recognized as the `Solo` type (§11.1). |
| `Outro`              | Ending (section) | Recognized as the `Outro` type (§11.1). "Ending" in this sense is a section name. It does not refer to an alternate ending (§10). |
| Custom section       | Tag, Vamp, Interlude | Accepted as custom section names (§11.2). |

### A.6 Navigation Terms

| Canonical term (CML) | Equivalent terms | CML treatment |
|----------------------|------------------|---------------|
| Coda                 | Tail             | Reserved navigation marker (§14). |
| Segno                | Sign             | Reserved navigation marker (§14). |
| D.C. (Da Capo)       | Da Capo, Return to top | Reserved navigation marker `%dc` (§14). |
| D.S. (Dal Segno)     | Dal Segno        | Reserved navigation marker `%ds` (§14). |
| Fine                 | End              | Reserved navigation marker `%fine` (§14). |

### A.7 Notes on Overloaded Terms

Some terms have more than one meaning in CML. Implementers **MUST** use the
meaning given by the context in which the term appears:

- **`%`** is the navigation sigil (§14) and also the repeat-bar glyph used in
  rendering (§19.1). The glyph is a display choice and is not part of the
  syntax.
- **"Ending"** is the alternate ending (§10) and is also an alias for the
  `Outro` section (§11.1). Within a `section` declaration, `Ending` means
  `Outro`. Within a repeat group, `[N]` markers are alternate endings.
- **"Repeat"** names the repeat construct (§9) and the repeat count (`xN`).
  The repeat count is not a separate construct.

---

*End of Chords Markup Language (CML) Specification, Version 0.1 Draft.*

