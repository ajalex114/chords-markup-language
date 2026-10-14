import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse, parseChordToken } from "../src/index.js";

const examplesDir = new URL("../../../examples/", import.meta.url);

describe("MVP examples", () => {
  const mvpExamples = [
    "01-simple-progression",
    "02-verse-chorus",
    "04-metadata",
    "06-sections",
    "07-measures",
    "08-chords",
    "09-accidentals",
    "10-slash-and-nochord",
    "11-song-form",
    "15-comments",
    "16-mvp-song",
  ];

  it.each(mvpExamples)("%s parses without errors", (name) => {
    const { ast, diagnostics } = parse(readFileSync(new URL(`${name}.cml`, examplesDir), "utf8"));
    expect(diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(ast.sections.length).toBeGreaterThan(0);
  });
});

describe("spans", () => {
  it("records chord, measure, repeat, and section spans (end exclusive)", () => {
    const { ast } = parse("section Verse\n||: C | Am7 :|| x3\n");
    const section = ast.sections[0]!;
    expect(section.span).toEqual({ start: { line: 1, column: 1 }, end: { line: 2, column: 19 } });

    const repeat = section.elements[0]!;
    expect(repeat.kind).toBe("repeat");
    if (repeat.kind !== "repeat") return;
    expect(repeat.span).toEqual({ start: { line: 2, column: 1 }, end: { line: 2, column: 19 } });
    expect(repeat.body[1]!.span).toEqual({ start: { line: 2, column: 7 }, end: { line: 2, column: 16 } });
    expect(repeat.body[1]!.chords[0]!.span).toEqual({ start: { line: 2, column: 9 }, end: { line: 2, column: 12 } });
  });

  it("counts columns in code points", () => {
    const { ast } = parse("| 😀C |");
    expect(ast.sections[0]!.elements).toHaveLength(1);
    const { diagnostics } = parse('title "😀" x\n');
    expect(diagnostics[0]).toMatchObject({ code: "V23", column: 11 });
  });
});

describe("diagnostic messages", () => {
  it("are human-readable and mention the offending text", () => {
    const { diagnostics } = parse("| H7 |\n");
    expect(diagnostics[0]).toMatchObject({ code: "V6", line: 1, column: 3 });
    expect(diagnostics[0]!.message).toContain("H7");
  });
});

describe("parseChordToken", () => {
  it("binds the accidental before the quality and splits the slash bass", () => {
    expect(parseChordToken("Bbmaj7/F").chord).toMatchObject({
      root: "B",
      accidental: "b",
      quality: "maj7",
      bass: { root: "F", accidental: null },
    });
  });

  it("does not treat __proto__ metadata keys specially", () => {
    const { ast } = parse("__proto__ polluted\n");
    expect(Object.keys(ast.metadata)).toEqual(["__proto__"]);
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });
});
