import type { Diagnostic, Measure, Position, RepeatGroup, Section, Song } from "cml-spec/types";
import { parseChordToken } from "./chord.js";
import { type Code, DiagnosticBag } from "./diagnostics.js";
import { matchCoreSection } from "./sections.js";

export interface ParseResult {
  /** Best-effort AST; always produced, even when there are errors (§18.2). */
  ast: Song;
  /** Sorted by line, then column, then code. */
  diagnostics: Diagnostic[];
}

/** Parses a CML v0.1 document. */
export function parse(source: string): ParseResult {
  return new Parser().parse(source);
}

const KNOWN_KEYS = new Set([
  "title", "artist", "composer", "album", "key", "scale", "tempo", "time_signature", "capo", "copyright", "version",
]);
const NUMERIC_KEYS = new Set(["tempo", "capo"]);
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const BARS = ["||:", ":||", "||", "|"] as const; // longest match first (§7.5.1)
const QUOTED_NAME_WITH_LABEL = /^(.*\S)\s+(\d+)$/su;

type Bar = (typeof BARS)[number];
interface Token {
  kind: "bar" | "word";
  text: string;
  /** 1-based start column. */
  column: number;
  /** 1-based column just past the token. */
  endColumn: number;
}
interface OpenRepeat {
  group: RepeatGroup;
  section: Section;
  line: number;
  column: number;
}

const isSpace = (c: string | undefined) => c === " " || c === "\t";

function skipSpaces(chars: string[], i: number, end: number): number {
  while (i < end && isSpace(chars[i])) i++;
  return i;
}

function matchBar(chars: string[], i: number, end: number): Bar | null {
  for (const bar of BARS) {
    if (i + bar.length <= end && chars.slice(i, i + bar.length).join("") === bar) return bar;
  }
  return null;
}

/** Reads a quoted string starting at chars[i] === '"'. Returns null if it is not closed before `end`. */
function readQuoted(chars: string[], i: number, end: number): { value: string; next: number } | null {
  let value = "";
  for (let j = i + 1; j < end; j++) {
    const c = chars[j];
    if (c === "\\" && chars[j + 1] === '"') {
      value += '"';
      j++;
    } else if (c === '"') {
      return { value, next: j + 1 };
    } else {
      value += c;
    }
  }
  return null;
}

/** Index just past the line's content: a `//` comment (§15) and trailing whitespace are removed. */
function contentEnd(chars: string[], start: number): number {
  let end = chars.length;
  let inQuote = false;
  for (let i = start; i < chars.length; i++) {
    const c = chars[i];
    if (inQuote) {
      if (c === "\\" && chars[i + 1] === '"') i++;
      else if (c === '"') inQuote = false;
    } else if (c === '"') {
      inQuote = true;
    } else if (c === "/" && chars[i + 1] === "/" && (i === start || isSpace(chars[i - 1]))) {
      end = i;
      break;
    }
  }
  while (end > start && isSpace(chars[end - 1])) end--;
  return end;
}

function tokenize(chars: string[], start: number, end: number): Token[] {
  const tokens: Token[] = [];
  let i = start;
  while (i < end) {
    if (isSpace(chars[i])) {
      i++;
      continue;
    }
    const bar = matchBar(chars, i, end);
    if (bar) {
      tokens.push({ kind: "bar", text: bar, column: i + 1, endColumn: i + 1 + bar.length });
      i += bar.length;
      continue;
    }
    let j = i;
    while (j < end && !isSpace(chars[j]) && !matchBar(chars, j, end)) j++;
    tokens.push({ kind: "word", text: chars.slice(i, j).join(""), column: i + 1, endColumn: j + 1 });
    i = j;
  }
  return tokens;
}

class Parser {
  private readonly diagnostics = new DiagnosticBag();
  private readonly metadata: Record<string, string | number> = {};
  private readonly sections: Section[] = [];
  private keySpelling: "key" | "scale" | null = null;
  private current: Section | null = null;
  private repeat: OpenRepeat | null = null;
  private bodyStarted = false;
  private line = 0;

  parse(source: string): ParseResult {
    const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
    lines.forEach((text, index) => {
      this.line = index + 1;
      this.parseLine(Array.from(text));
    });
    this.closeOpenRepeat("V2");
    return {
      ast: { cmlVersion: "0.1", metadata: this.metadata, sections: this.sections },
      diagnostics: this.diagnostics.sorted(),
    };
  }

  private report(code: Code, column: number, message: string): void {
    this.diagnostics.add(code, this.line, column, message);
  }

  private pos(column: number): Position {
    return { line: this.line, column };
  }

  private parseLine(chars: string[]): void {
    const start = skipSpaces(chars, 0, chars.length);
    if (start >= chars.length) return;
    if (chars[start] === "/" && chars[start + 1] === "/") return;
    // Lyric lines are outside the parser MVP and are ignored without a diagnostic.
    if (chars[start] === ">") return;

    const end = contentEnd(chars, start);
    let tokenEnd = start;
    while (tokenEnd < end && !isSpace(chars[tokenEnd])) tokenEnd++;
    const firstToken = chars.slice(start, tokenEnd).join("");
    const first = chars[start];
    const column = start + 1;

    if (firstToken.toLowerCase() === "section") return this.sectionHeader(chars, start, end);
    if (first === "|") return this.measureLine(chars, start, end);
    if (matchBar(chars, start, end) === ":||") {
      this.bodyStarted = true;
      this.report("V5", column, "A measure line must start with | or ||:, not :||.");
      return;
    }
    if (first === "%") {
      this.report("V15", column, "Navigation markers are not supported in v0.1; line skipped.");
      return;
    }
    if (first === "@" || first === "!" || first === "*") {
      this.report("V21", column, `Lines starting with "${first}" are reserved; line skipped.`);
      return;
    }
    this.propertyLine(chars, start, end);
  }

  // ------------------------------------------------------------------ metadata

  private propertyLine(chars: string[], start: number, end: number): void {
    const column = start + 1;
    if (this.bodyStarted) {
      this.report("V20", column, "Property lines must come before the first section or measure line.");
      return;
    }
    let keyEnd = start;
    while (keyEnd < end && !isSpace(chars[keyEnd])) keyEnd++;
    const key = chars.slice(start, keyEnd).join("");
    if (!IDENTIFIER.test(key)) {
      this.report("V23", column, `"${key}" is not a valid property key.`);
      return;
    }
    const valueStart = skipSpaces(chars, keyEnd, end);
    if (valueStart >= end) {
      this.report("V23", column, `Property "${key}" has no value; line dropped.`);
      return;
    }

    let value: string;
    if (chars[valueStart] === '"') {
      const quoted = readQuoted(chars, valueStart, end);
      if (!quoted) {
        this.report("V23", valueStart + 1, `Unclosed quote in property "${key}"; line dropped.`);
        return;
      }
      value = quoted.value;
      const after = skipSpaces(chars, quoted.next, end);
      if (after < end) this.report("V23", after + 1, `Unexpected text after the value of "${key}".`);
    } else {
      value = chars.slice(valueStart, end).join("");
      if (/[ \t]/.test(value)) {
        this.report("V22", valueStart + 1, `Value of "${key}" contains spaces; quote it, e.g. ${key} "${value}".`);
      }
    }
    this.setMetadata(key, value, column);
  }

  private setMetadata(rawKey: string, value: string, column: number): void {
    let key = rawKey.toLowerCase();
    if (!KNOWN_KEYS.has(key)) this.report("V10", column, `Unknown metadata key "${rawKey}"; preserved.`);
    if (key === "key" || key === "scale") {
      if (this.keySpelling && this.keySpelling !== key && this.metadata["key"] !== value) {
        this.report("V16", column, `"key" and "scale" have different values ("${String(this.metadata["key"])}" and "${value}").`);
      }
      this.keySpelling = key;
      key = "key";
    }
    const stored = NUMERIC_KEYS.has(key) && /^\d+$/.test(value) ? Number(value) : value;
    // defineProperty keeps keys such as "__proto__" as ordinary data.
    Object.defineProperty(this.metadata, key, { value: stored, enumerable: true, writable: true, configurable: true });
  }

  // ------------------------------------------------------------------ sections

  private sectionHeader(chars: string[], start: number, end: number): void {
    this.bodyStarted = true;
    const keywordColumn = start + 1;
    const headerSpanEnd = this.pos(end + 1);
    let i = skipSpaces(chars, start + "section".length, end);

    let name: string | null = null;
    let quoted = false;
    if (i < end) {
      if (chars[i] === '"') {
        const q = readQuoted(chars, i, end);
        if (!q) {
          this.report("V23", i + 1, "Unclosed quote in section name; header dropped.");
          return;
        }
        name = q.value;
        quoted = true;
        i = q.next;
      } else {
        const nameStart = i;
        while (i < end && !isSpace(chars[i])) i++;
        name = chars.slice(nameStart, i).join("");
      }
    }
    if (name === null || name.trim() === "") {
      this.report("V1", keywordColumn, "Section has no name.");
      this.startSection(null, null, false, null, keywordColumn, headerSpanEnd);
      return;
    }

    let label: string | null = null;
    i = skipSpaces(chars, i, end);
    if (i < end) {
      if (chars[i] === '"') {
        const q = readQuoted(chars, i, end);
        if (!q) {
          this.report("V23", i + 1, "Unclosed quote in section label; header dropped.");
          return;
        }
        label = q.value;
        i = q.next;
      } else {
        const labelStart = i;
        while (i < end && !isSpace(chars[i])) i++;
        label = chars.slice(labelStart, i).join("");
      }
      i = skipSpaces(chars, i, end);
      if (i < end) this.report("V23", i + 1, "Unexpected text after the section label; ignored.");
    }

    if (quoted && label === null) {
      const split = QUOTED_NAME_WITH_LABEL.exec(name);
      if (split?.[1] && split[2]) {
        name = split[1];
        label = split[2];
      }
    }
    const core = matchCoreSection(name);
    this.startSection(core ?? name, label, core !== null, name, keywordColumn, headerSpanEnd);
  }

  private startSection(
    type: string | null,
    label: string | null,
    core: boolean,
    raw: string | null,
    column: number,
    spanEnd: Position,
  ): Section {
    this.closeOpenRepeat("V8");
    const section: Section = { type, label, core, raw, elements: [], span: { start: this.pos(column), end: spanEnd } };
    this.sections.push(section);
    this.current = section;
    return section;
  }

  private ensureSection(column: number): Section {
    return this.current ?? this.startSection(null, null, false, null, column, this.pos(column));
  }

  private extendSection(section: Section, end: Position): void {
    if (section.span) section.span.end = end;
  }

  // ------------------------------------------------------------------ measures and repeats

  private closeOpenRepeat(code: "V2" | "V8"): void {
    const open = this.repeat;
    if (!open) return;
    this.repeat = null;
    const message =
      code === "V8"
        ? "Repeat is still open at the next section; repeats must be section-local."
        : "Repeat is never closed with :||.";
    this.diagnostics.add(code, open.line, open.column, message);
    open.section.elements.push(open.group);
  }

  private measureLine(chars: string[], start: number, end: number): void {
    this.bodyStarted = true;
    const tokens = tokenize(chars, start, end);
    const barIndexes = tokens.flatMap((t, i) => (t.kind === "bar" ? [i] : []));
    if (barIndexes.length < 2) {
      const at = tokens.find((t) => t.kind === "word") ?? tokens[0];
      this.report("V5", at?.column ?? start + 1, "A measure line needs an opening and a closing bar.");
      return;
    }

    const section = this.ensureSection(start + 1);
    const lastBar = barIndexes.length - 1;
    barIndexes.forEach((tokenIndex, k) => {
      const bar = tokens[tokenIndex]!;
      if (bar.text === "||") this.report("V18", bar.column, "Plain double bar || is reserved; treated as |.");
      if (bar.text === "||:" && k !== 0) {
        this.report("V17", bar.column, "||: must be the first token of a measure line; treated as |.");
      }
      if (bar.text === ":||" && k !== lastBar) {
        this.report("V17", bar.column, ":|| must be the last bar of a measure line; treated as |.");
      }
    });
    const firstBar = tokens[barIndexes[0]!]!;
    const closingBar = tokens[barIndexes[lastBar]!]!;
    const opensRepeat = firstBar.text === "||:";
    const closesRepeat = closingBar.text === ":||";

    // Text after the last bar: an optional repeat count after :||, then nothing else.
    const trailing = tokens.slice(barIndexes[lastBar]! + 1);
    let count = 2;
    let countToken: Token | null = null;
    let invalidCount = false;
    if (closesRepeat && trailing[0] && /^[xX]/.test(trailing[0].text)) {
      countToken = trailing.shift()!;
      const match = /^[xX](\d+)$/.exec(countToken.text);
      const n = match ? Number(match[1]) : NaN;
      if (Number.isSafeInteger(n) && n >= 1) count = n;
      else invalidCount = true;
    }
    if (trailing[0]) this.report("V5", trailing[0].column, "Unexpected text after the last bar line; ignored.");

    if (opensRepeat) {
      if (this.repeat) {
        this.report("V9", firstBar.column, "Repeats cannot nest; ||: treated as |.");
      } else {
        this.repeat = {
          group: { kind: "repeat", count: 2, body: [], endings: [], span: { start: this.pos(firstBar.column), end: this.pos(firstBar.endColumn) } },
          section,
          line: this.line,
          column: firstBar.column,
        };
      }
    }

    for (let k = 0; k < lastBar; k++) {
      const open = tokens[barIndexes[k]!]!;
      const close = tokens[barIndexes[k + 1]!]!;
      const measure: Measure = {
        kind: "measure",
        chords: [],
        span: { start: this.pos(open.column), end: this.pos(close.endColumn) },
      };
      for (const word of tokens.slice(barIndexes[k]! + 1, barIndexes[k + 1]!)) {
        const { chord, issues } = parseChordToken(word.text);
        for (const issue of issues) this.report(issue.code, word.column, issue.message);
        if (chord) {
          chord.span = { start: this.pos(word.column), end: this.pos(word.endColumn) };
          measure.chords.push(chord);
        }
      }
      if (this.repeat) {
        this.repeat.group.body.push(measure);
        if (this.repeat.group.span) this.repeat.group.span.end = this.pos(close.endColumn);
      } else {
        section.elements.push(measure);
      }
    }

    if (closesRepeat) {
      const open = this.repeat;
      if (open) {
        if (invalidCount && countToken) {
          this.report("V4", countToken.column, `Invalid repeat count "${countToken.text}"; expected xN with N >= 1. Using 2.`);
        }
        open.group.count = count;
        if (open.group.span) open.group.span.end = this.pos((countToken ?? closingBar).endColumn);
        open.section.elements.push(open.group);
        this.repeat = null;
      } else {
        this.report("V3", closingBar.column, ":|| has no matching ||:; treated as |.");
      }
    }
    this.extendSection(section, this.pos(end + 1));
  }
}
