import type { Accidental, Chord, RootNote } from "cml-spec/types";
import type { Code } from "./diagnostics.js";

export interface ChordIssue {
  code: Code;
  message: string;
}

export interface ChordResult {
  /** Undefined when the token is dropped (V6, V21). */
  chord?: Chord;
  issues: ChordIssue[];
}

const ROOTS = new Set<string>(["A", "B", "C", "D", "E", "F", "G"]);
const QUALITY_CHARS = /^[A-Za-z0-9+\-#()°ø]*$/u;
const DIGITS_IN_PARENS = /^\(\d+\)$/;
const BASS = /^([A-G])([#b]?)$/;

const isAccidental = (c: string | undefined): c is Accidental => c === "#" || c === "b";

function balancedParens(text: string): boolean {
  let depth = 0;
  for (const c of text) {
    if (c === "(") depth++;
    else if (c === ")" && --depth < 0) return false;
  }
  return depth === 0;
}

/** Parses one chord token (§8): root, accidental (binds first, §8.3.1), opaque quality, optional slash bass. */
export function parseChordToken(text: string): ChordResult {
  const first = text[0] ?? "";
  if (first === "@" || first === "!" || first === "*") {
    return { issues: [{ code: "V21", message: `Token "${text}" starts with reserved sigil "${first}"; skipped.` }] };
  }
  if (text === "N.C." || text === "NC") {
    return {
      chord: { kind: "chord", root: null, accidental: null, quality: null, bass: null, duration: null, noChord: true, raw: text },
      issues: [],
    };
  }
  if (!ROOTS.has(first)) {
    return { issues: [{ code: "V6", message: `Invalid chord root in "${text}"; roots are A-G (upper case).` }] };
  }

  let rest = text.slice(1);
  let accidental: Accidental | null = null;
  if (isAccidental(rest[0])) {
    accidental = rest[0];
    rest = rest.slice(1);
  }

  let bass: Chord["bass"] = null;
  const slash = rest.indexOf("/");
  if (slash >= 0) {
    const match = BASS.exec(rest.slice(slash + 1));
    if (!match) {
      return { issues: [{ code: "V6", message: `Invalid bass note in "${text}"; expected A-G with an optional # or b.` }] };
    }
    bass = { root: match[1] as RootNote, accidental: (match[2] || null) as Accidental | null };
    rest = rest.slice(0, slash);
  }

  const issues: ChordIssue[] = [];
  const quality = rest === "" ? null : rest;
  if (quality !== null) {
    if (DIGITS_IN_PARENS.test(quality)) {
      issues.push({ code: "V19", message: `Quality "${quality}" in "${text}" looks like a duration; durations are not supported in v0.1.` });
    } else if (!QUALITY_CHARS.test(quality) || !balancedParens(quality)) {
      issues.push({ code: "V11", message: `Malformed chord quality "${quality}" in "${text}".` });
    }
  }

  return {
    chord: { kind: "chord", root: first as RootNote, accidental, quality, bass, duration: null, noChord: false, raw: text },
    issues,
  };
}
