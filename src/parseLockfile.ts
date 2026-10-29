export type LockEntry = {
  name: string;
  version: string;
  isDirect: boolean;
  lockPath: string;
};

type NpmLock = {
  lockfileVersion?: number;
  packages?: Record<string, { version?: string; name?: string }>;
  dependencies?: Record<string, NpmV1Node>;
};

type NpmV1Node = {
  version?: string;
  dependencies?: Record<string, NpmV1Node>;
};

function nameFromNodeModulesPath(lockPath: string): string | null {
  const marker = "node_modules/";
  const idx = lockPath.lastIndexOf(marker);
  if (idx === -1) return null;
  return lockPath.slice(idx + marker.length) || null;
}

function collectV1(
  tree: Record<string, NpmV1Node> | undefined,
  out: LockEntry[],
  isDirect: boolean,
): void {
  if (!tree) return;
  for (const [name, node] of Object.entries(tree)) {
    if (!node?.version) continue;
    out.push({
      name,
      version: node.version,
      isDirect,
      lockPath: name,
    });
    collectV1(node.dependencies, out, false);
  }
}

export function parseLockfileJson(raw: unknown): LockEntry[] {
  if (!raw || typeof raw !== "object") {
    throw new Error("Lockfile must be a JSON object.");
  }
  const lock = raw as NpmLock;
  const entries: LockEntry[] = [];

  if (lock.packages && typeof lock.packages === "object") {
    const root = lock.packages[""] as
      | {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
          optionalDependencies?: Record<string, string>;
        }
      | undefined;
    const direct = new Set([
      ...Object.keys(root?.dependencies ?? {}),
      ...Object.keys(root?.devDependencies ?? {}),
      ...Object.keys(root?.optionalDependencies ?? {}),
    ]);

    for (const [lockPath, meta] of Object.entries(lock.packages)) {
      if (!lockPath || lockPath === "") continue;
      const name = meta.name || nameFromNodeModulesPath(lockPath);
      if (!name || !meta.version) continue;
      entries.push({
        name,
        version: meta.version,
        isDirect: direct.has(name) && lockPath === `node_modules/${name}`,
        lockPath,
      });
    }
    return dedupe(entries);
  }

  if (lock.dependencies) {
    collectV1(lock.dependencies, entries, true);
    return dedupe(entries);
  }

  throw new Error(
    "This does not look like an npm package-lock.json (need packages or dependencies).",
  );
}

function dedupe(entries: LockEntry[]): LockEntry[] {
  const map = new Map<string, LockEntry>();
  for (const entry of entries) {
    const key = `${entry.name}@${entry.version}`;
    const existing = map.get(key);
    if (!existing || (entry.isDirect && !existing.isDirect)) {
      map.set(key, entry);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function parseLockfileText(text: string): LockEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Could not parse JSON. Upload an npm package-lock.json.");
  }
  return parseLockfileJson(parsed);
}
