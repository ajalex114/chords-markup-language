// TypeScript view of the CML v0.1 AST. Mirrors schema/ast.schema.json (SPECIFICATION.md §17).

export type RootNote = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type Accidental = "#" | "b";

/** 1-based position; columns count Unicode code points. */
export interface Position {
  line: number;
  column: number;
}

/** `end` is exclusive. Ignored by conformance comparison. */
export interface Span {
  start: Position;
  end: Position;
}

export interface Song {
  cmlVersion: "0.1";
  metadata: Record<string, string | number>;
  sections: Section[];
}

export interface Section {
  /** Canonical core type, custom name, or null (implicit or nameless section). */
  type: string | null;
  label: string | null;
  core: boolean;
  /** Section name as written, without quotes or label. */
  raw: string | null;
  elements: Element[];
  span?: Span;
}

export type Element = Measure | RepeatGroup | NavigationMarker;

export interface Measure {
  kind: "measure";
  chords: Chord[];
  lyrics?: string[];
  span?: Span;
}

export interface Chord {
  kind: "chord";
  /** null only when noChord is true. */
  root: RootNote | null;
  accidental: Accidental | null;
  quality: string | null;
  bass: { root: RootNote; accidental: Accidental | null } | null;
  /** Reserved; always null in v0.1. */
  duration: null;
  noChord: boolean;
  raw: string;
  span?: Span;
}

export interface RepeatGroup {
  kind: "repeat";
  count: number;
  body: Measure[];
  endings: Ending[];
  span?: Span;
}

export interface Ending {
  passes: number[];
  body: Measure[];
  span?: Span;
}

/** Design sketch; never produced in v0.1. */
export interface NavigationMarker {
  kind: "nav";
  marker: string;
  name: string | null;
  span?: Span;
}

export type Severity = "error" | "warning";

export interface Diagnostic {
  /** Stable code from diagnostics/diagnostics.json, e.g. "V2". */
  code: string;
  severity: Severity;
  message: string;
  line: number;
  column: number;
}

/** Shape of each fixture's expected.json. */
export interface FixtureExpectation {
  description: string;
  mvp: boolean;
  spec?: string[];
  ast: Song;
  diagnostics: Array<Omit<Diagnostic, "message">>;
}
