import type { RegistryFacts } from "./registry.ts";

export type GroundResult = {
  text: string;
  dropped: string[];
  refused: boolean;
};

function allowedTokens(facts: RegistryFacts): Set<string> {
  const bag = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (!value) return;
    for (const token of value.toLowerCase().split(/[^a-z0-9@/._+-]+/)) {
      if (token.length >= 2) bag.add(token);
    }
    for (const year of value.match(/\b(19|20)\d{2}\b/g) ?? []) bag.add(year);
  };
  add(facts.name);
  add(facts.lockedVersion);
  add(facts.latestVersion);
  add(facts.lastPublish);
  add(facts.deprecatedLocked);
  add(facts.deprecatedLatest);
  add(facts.license);
  add(facts.description);
  for (const m of facts.maintainers) add(m);
  add("npm");
  add("lockfile");
  add("package");
  add("registry");
  add("ofrenda");
  add("candle");
  add("quiet");
  add("silent");
  add("unpublished");
  add("deprecated");
  add("maintainer");
  add("maintainers");
  add("version");
  add("direct");
  add("transitive");
  add("years");
  add("days");
  add("month");
  add("months");
  add("year");
  add("ago");
  add("still");
  add("locked");
  add("latest");
  add("none");
  add("no");
  add("not");
  add("the");
  add("this");
  add("that");
  add("and");
  add("for");
  add("with");
  add("from");
  add("your");
  add("you");
  add("it");
  add("its");
  add("in");
  add("of");
  add("to");
  add("a");
  add("an");
  add("is");
  add("are");
  add("was");
  add("were");
  add("has");
  add("have");
  add("had");
  add("on");
  add("at");
  add("as");
  add("or");
  add("but");
  add("if");
  add("we");
  add("our");
  add("may");
  add("must");
  add("only");
  add("what");
  add("when");
  add("where");
  add("who");
  add("which");
  add("one");
  add("two");
  add("last");
  add("publish");
  add("published");
  add("release");
  add("released");
  add("message");
  add("says");
  add("said");
  add("named");
  add("called");
  add("here");
  add("there");
  add("never");
  add("left");
  add("gone");
  add("dead");
  add("alive");
  add("ghost");
  add("spirit");
  add("altar");
  add("offering");
  add("remembrance");
  add("record");
  add("facts");
  add("fact");
  add("unknown");
  add("empty");
  add("list");
  add("field");
  add("fields");
  add("npmjs");
  add("http");
  add("https");
  add("com");
  add("org");
  add("io");
  return bag;
}

export function groundEulogy(text: string, facts: RegistryFacts): GroundResult {
  const trimmed = text.trim();
  if (!trimmed) return { text: "", dropped: [], refused: true };

  const bag = allowedTokens(facts);
  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const kept: string[] = [];
  const dropped: string[] = [];

  for (const sentence of sentences) {
    const years = sentence.match(/\b(19|20)\d{2}\b/g) ?? [];
    const yearOk = years.every((y) => bag.has(y));
    const tokens = sentence.toLowerCase().split(/[^a-z0-9@/._+-]+/).filter(Boolean);
    const unknown = tokens.filter((t) => t.length >= 5 && !bag.has(t) && !/^\d+$/.test(t));
    if (!yearOk || unknown.length > 3) {
      dropped.push(sentence);
      continue;
    }
    kept.push(sentence);
  }

  if (kept.length === 0) {
    return { text: "", dropped, refused: true };
  }
  return { text: kept.join(" "), dropped, refused: false };
}

export function templateEulogy(facts: RegistryFacts): string {
  const bits: string[] = [];
  bits.push(`${facts.name} is locked at ${facts.lockedVersion} in this lockfile.`);
  if (facts.unpublished) {
    bits.push("The npm registry returned 404. This name is unpublished.");
    return bits.join(" ");
  }
  if (facts.latestVersion) {
    bits.push(`The registry latest tag is ${facts.latestVersion}.`);
  }
  if (facts.lastPublish) {
    bits.push(`The last publish timestamp on that record is ${facts.lastPublish}.`);
  }
  const dep = facts.deprecatedLocked || facts.deprecatedLatest;
  if (dep) {
    bits.push(`A deprecated field on the registry record says: ${dep}`);
  }
  if (facts.maintainers.length) {
    bits.push(`Maintainers listed: ${facts.maintainers.join(", ")}.`);
  } else if (!facts.error) {
    bits.push("The maintainers list on the record is empty.");
  }
  if (facts.license) bits.push(`License: ${facts.license}.`);
  if (facts.description) bits.push(`Description: ${facts.description}`);
  if (facts.error) bits.push(`Registry error: ${facts.error}.`);
  return bits.join(" ");
}
