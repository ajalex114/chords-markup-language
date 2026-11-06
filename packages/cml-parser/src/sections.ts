/** Core section vocabulary (§11.1), keyed by lower-cased name or alias. */
const CORE_SECTIONS = new Map<string, string>([
  ["intro", "Intro"],
  ["verse", "Verse"],
  ["prechorus", "PreChorus"],
  ["pre-chorus", "PreChorus"],
  ["pre chorus", "PreChorus"],
  ["chorus", "Chorus"],
  ["bridge", "Bridge"],
  ["solo", "Solo"],
  ["instrumental", "Solo"],
  ["outro", "Outro"],
  ["ending", "Outro"],
]);

/** Returns the canonical core type for a section name, or null if it is custom. */
export function matchCoreSection(name: string): string | null {
  return CORE_SECTIONS.get(name.toLowerCase()) ?? null;
}
