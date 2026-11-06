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

describe("tempo metadata", () => {
  it.each(["1", "120", "999", '"120"'])("accepts tempo %s as a number", (value) => {
    const { ast, diagnostics } = parse(`tempo ${value}`);
    expect(diagnostics).toEqual([]);
    expect(ast.metadata.tempo).toBe(Number(value.replaceAll('"', "")));
  });

  it.each(["0", "1000", "99999999999999999999", "-1", "1.5", "1e2", "fast", '""'])(
    "rejects invalid tempo %s without storing it",
    (value) => {
      const { ast, diagnostics } = parse(`tempo ${value}`);
      expect(ast.metadata).toEqual({});
      expect(diagnostics).toEqual([
        expect.objectContaining({ code: "V25", severity: "error", line: 1, column: 1 }),
      ]);
    },
  );
});

describe("comments", () => {
  it.each(['"x', '"G"'])("ignores trailing comments after invalid chord %s", (token) => {
    const { diagnostics } = parse(`| C | ${token} | // play softly`);
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: "V6", line: 1, column: 7 }),
    ]);
  });

  it("preserves comment markers inside quoted properties and section names", () => {
    const { ast, diagnostics } = parse(
      'title "Hello // World" // title comment\nsection "Verse // One" // section comment\n| C | // play softly',
    );
    expect(diagnostics).toEqual([]);
    expect(ast.metadata.title).toBe("Hello // World");
    expect(ast.sections[0]).toMatchObject({ type: "Verse // One", raw: "Verse // One" });
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
