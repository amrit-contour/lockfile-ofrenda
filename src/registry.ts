export type RegistryFacts = {
  name: string;
  lockedVersion: string;
  isDirect: boolean;
  latestVersion: string | null;
  lastPublish: string | null;
  lastPublishDays: number | null;
  deprecatedLocked: string | null;
  deprecatedLatest: string | null;
  maintainers: string[];
  license: string | null;
  description: string | null;
  unpublished: boolean;
  error: string | null;
};

const cache = new Map<string, RegistryFacts>();

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

type RegistryDoc = {
  "dist-tags"?: { latest?: string };
  time?: Record<string, string>;
  maintainers?: Array<{ name?: string }>;
  description?: string;
  license?: string;
  versions?: Record<
    string,
    { deprecated?: string; license?: string; description?: string }
  >;
};

export async function fetchRegistryFacts(
  name: string,
  lockedVersion: string,
  isDirect: boolean,
): Promise<RegistryFacts> {
  const cacheKey = `${name}@${lockedVersion}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const empty = (partial: Partial<RegistryFacts>): RegistryFacts => ({
    name,
    lockedVersion,
    isDirect,
    latestVersion: null,
    lastPublish: null,
    lastPublishDays: null,
    deprecatedLocked: null,
    deprecatedLatest: null,
    maintainers: [],
    license: null,
    description: null,
    unpublished: false,
    error: null,
    ...partial,
  });

  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "lockfile-ofrenda/0.1 (Hacktoberfest Week 4)",
      },
    });
  } catch (error) {
    const facts = empty({
      error: error instanceof Error ? error.message : "network error",
    });
    cache.set(cacheKey, facts);
    return facts;
  }

  if (response.status === 404) {
    const facts = empty({ unpublished: true });
    cache.set(cacheKey, facts);
    return facts;
  }

  if (!response.ok) {
    const facts = empty({ error: `registry ${response.status}` });
    cache.set(cacheKey, facts);
    return facts;
  }

  const doc = (await response.json()) as RegistryDoc;
  const latest = doc["dist-tags"]?.latest ?? null;
  const lastPublish =
    (latest && doc.time?.[latest]) || doc.time?.modified || null;
  const lockedMeta = doc.versions?.[lockedVersion];
  const latestMeta = latest ? doc.versions?.[latest] : undefined;

  const facts = empty({
    latestVersion: latest,
    lastPublish,
    lastPublishDays: daysSince(lastPublish),
    deprecatedLocked: lockedMeta?.deprecated ?? null,
    deprecatedLatest: latestMeta?.deprecated ?? null,
    maintainers: (doc.maintainers ?? [])
      .map((m) => m.name)
      .filter((n): n is string => Boolean(n)),
    license: lockedMeta?.license ?? doc.license ?? null,
    description: lockedMeta?.description ?? doc.description ?? null,
  });
  cache.set(cacheKey, facts);
  return facts;
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}
