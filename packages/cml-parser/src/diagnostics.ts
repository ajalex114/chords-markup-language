import type { Diagnostic, Severity } from "cml-spec/types";

/** Severities of the codes this parser emits. Must match cml-spec/diagnostics.json (checked by tests). */
export const SEVERITY = {
  V1: "error",
  V2: "error",
  V3: "error",
  V4: "error",
  V5: "error",
  V6: "error",
  V8: "error",
  V9: "error",
  V10: "warning",
  V11: "warning",
  V15: "warning",
  V16: "error",
  V17: "error",
  V18: "warning",
  V19: "warning",
  V20: "error",
  V21: "warning",
  V22: "warning",
  V23: "error",
} as const satisfies Record<string, Severity>;

export type Code = keyof typeof SEVERITY;

export class DiagnosticBag {
  private readonly items: Diagnostic[] = [];

  add(code: Code, line: number, column: number, message: string): void {
    this.items.push({ code, severity: SEVERITY[code], message, line, column });
  }

  /** Diagnostics sorted by line, then column, then code. */
  sorted(): Diagnostic[] {
    const codeNumber = (code: string) => Number(code.slice(1));
    return [...this.items].sort(
      (a, b) => a.line - b.line || a.column - b.column || codeNumber(a.code) - codeNumber(b.code),
    );
  }
}
