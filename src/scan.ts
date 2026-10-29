import { parseLockfileJson, parseLockfileText, type LockEntry } from "./parseLockfile.ts";
import { fetchRegistryFacts, mapPool } from "./registry.ts";
import { scoreOffering, sortOfferings, type Offering } from "./score.ts";

export type ScanResult = {
  projectName: string | null;
  packageCount: number;
  ghostCount: number;
  offerings: Offering[];
  scannedAt: string;
};

function projectNameFromRaw(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const name = (raw as { name?: unknown }).name;
  return typeof name === "string" ? name : null;
}

export async function scanEntries(entries: LockEntry[]): Promise<Offering[]> {
  const facts = await mapPool(entries, 8, (entry) =>
    fetchRegistryFacts(entry.name, entry.version, entry.isDirect),
  );
  return sortOfferings(facts.map(scoreOffering));
}

export async function scanLockfile(input: string | unknown): Promise<ScanResult> {
  const raw = typeof input === "string" ? (JSON.parse(input) as unknown) : input;
  const entries =
    typeof input === "string" ? parseLockfileText(input) : parseLockfileJson(raw);
  const offerings = await scanEntries(entries);
  return {
    projectName: projectNameFromRaw(raw),
    packageCount: offerings.length,
    ghostCount: offerings.filter((o) => o.isGhost).length,
    offerings,
    scannedAt: new Date().toISOString(),
  };
}
