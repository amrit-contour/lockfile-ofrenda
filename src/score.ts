import type { RegistryFacts } from "./registry.ts";

export type GhostReason =
  | "unpublished"
  | "deprecated"
  | "silent"
  | "no-maintainers";

export type Offering = RegistryFacts & {
  quietYears: number | null;
  reasons: GhostReason[];
  isGhost: boolean;
};

const SILENT_DAYS = 730;

export function scoreOffering(facts: RegistryFacts): Offering {
  const reasons: GhostReason[] = [];
  if (facts.unpublished) reasons.push("unpublished");
  if (facts.deprecatedLocked || facts.deprecatedLatest) reasons.push("deprecated");
  if (
    facts.lastPublishDays != null &&
    facts.lastPublishDays >= SILENT_DAYS &&
    !facts.unpublished
  ) {
    reasons.push("silent");
  }
  if (
    !facts.unpublished &&
    !facts.error &&
    facts.maintainers.length === 0 &&
    facts.latestVersion
  ) {
    reasons.push("no-maintainers");
  }

  const quietYears =
    facts.lastPublishDays == null
      ? null
      : Math.floor(facts.lastPublishDays / 365);

  return {
    ...facts,
    quietYears,
    reasons,
    isGhost: reasons.length > 0,
  };
}

export function sortOfferings(items: Offering[]): Offering[] {
  return [...items].sort((a, b) => {
    if (a.isGhost !== b.isGhost) return a.isGhost ? -1 : 1;
    const da = a.lastPublishDays ?? -1;
    const db = b.lastPublishDays ?? -1;
    if (da !== db) return db - da;
    return a.name.localeCompare(b.name);
  });
}
