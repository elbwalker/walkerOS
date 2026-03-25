const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/npm';
const DEFAULT_SCHEMA_PATH = 'dist/walkerOS.json';

function parsePlatform(value: unknown): string | string[] | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((v) => typeof v === 'string'))
    return value as string[];
  return undefined;
}

export interface ExampleSummary {
  name: string;
  description?: string;
}

export interface WalkerOSPackageMeta {
  packageName: string;
  version: string;
  description?: string;
  type?: string;
  platform?: string | string[];
}

export interface WalkerOSPackageInfo {
  packageName: string;
  version: string;
  type?: string;
  platform?: string | string[];
  schemas: Record<string, unknown>;
  examples: Record<string, unknown>;
  hints?: Record<string, unknown>;
}

export interface WalkerOSPackage extends WalkerOSPackageInfo {
  description?: string;
  docs?: string;
  source?: string;
  hintKeys: string[];
  exampleSummaries: ExampleSummary[];
}

export async function fetchPackage(
  packageName: string,
  options?: { version?: string; timeout?: number; baseUrl?: string },
): Promise<WalkerOSPackage> {
  const ver = options?.version || 'latest';
  const timeoutMs = options?.timeout || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = controller.signal;

  try {
    let pkg: Record<string, unknown>;
    let walkerOSJson: Record<string, unknown>;

    if (options?.baseUrl) {
      const encoded = encodeURIComponent(packageName);
      const base = `${options.baseUrl}/api/packages/${encoded}`;
      pkg = await fetchJson(`${base}?version=${ver}&path=package.json`, signal);
      walkerOSJson = await fetchJson(
        `${base}?version=${ver}&path=dist/walkerOS.json`,
        signal,
      );
    } else {
      const base = `${JSDELIVR_BASE}/${packageName}@${ver}`;
      pkg = await fetchJson(`${base}/package.json`, signal);
      walkerOSJson = await fetchJson(`${base}/${DEFAULT_SCHEMA_PATH}`, signal);
    }

    return parsePackage(packageName, ver, pkg, walkerOSJson);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(
  url: string,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

function parsePackage(
  packageName: string,
  ver: string,
  pkg: Record<string, unknown>,
  walkerOSJson: Record<string, unknown>,
): WalkerOSPackage {
  const meta = (walkerOSJson.$meta as Record<string, unknown>) || {};
  const schemas = (walkerOSJson.schemas as Record<string, unknown>) || {};
  const examples = (walkerOSJson.examples as Record<string, unknown>) || {};
  const hints = walkerOSJson.hints as Record<string, unknown> | undefined;
  const hintKeys = hints ? Object.keys(hints) : [];

  const exampleSummaries: ExampleSummary[] = [];
  const stepExamples = (examples.step || {}) as Record<string, unknown>;
  for (const [name, example] of Object.entries(stepExamples)) {
    const ex = example as Record<string, unknown> | undefined;
    const summary: ExampleSummary = { name };
    if (typeof ex?.description === 'string')
      summary.description = ex.description;
    exampleSummaries.push(summary);
  }

  const docs = typeof meta.docs === 'string' ? meta.docs : undefined;
  const source = typeof meta.source === 'string' ? meta.source : undefined;

  return {
    packageName,
    version: typeof pkg.version === 'string' ? pkg.version : ver,
    description:
      typeof pkg.description === 'string' ? pkg.description : undefined,
    type: typeof meta.type === 'string' ? meta.type : undefined,
    platform: parsePlatform(meta.platform),
    schemas,
    examples,
    ...(docs ? { docs } : {}),
    ...(source ? { source } : {}),
    ...(hints && Object.keys(hints).length > 0 ? { hints } : {}),
    hintKeys,
    exampleSummaries,
  };
}

/**
 * @deprecated Use fetchPackage instead.
 * Still used by: entry.ts (validator), package-schemas.ts (MCP resource).
 */
export async function fetchPackageSchema(
  packageName: string,
  options?: { version?: string; timeout?: number },
): Promise<WalkerOSPackageInfo> {
  const pkg = await fetchPackage(packageName, options);
  return {
    packageName: pkg.packageName,
    version: pkg.version,
    type: pkg.type,
    platform: pkg.platform,
    schemas: pkg.schemas,
    examples: pkg.examples,
    ...(pkg.hints ? { hints: pkg.hints } : {}),
  };
}
