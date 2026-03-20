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
  options?: { version?: string; timeout?: number },
): Promise<WalkerOSPackage> {
  const ver = options?.version || 'latest';
  const base = `${JSDELIVR_BASE}/${packageName}@${ver}`;
  const controller = new AbortController();
  const timeoutMs = options?.timeout || 10000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Fetch package.json
    const pkgRes = await fetch(`${base}/package.json`, {
      signal: controller.signal,
    });
    if (!pkgRes.ok) {
      throw new Error(
        `Package "${packageName}" not found on npm (HTTP ${pkgRes.status})`,
      );
    }
    const pkg = (await pkgRes.json()) as Record<string, unknown>;

    // Fetch walkerOS.json
    const schemaRes = await fetch(`${base}/${DEFAULT_SCHEMA_PATH}`, {
      signal: controller.signal,
    });
    if (!schemaRes.ok) {
      throw new Error(
        `walkerOS.json not found at ${DEFAULT_SCHEMA_PATH} (HTTP ${schemaRes.status}). ` +
          `This package may not support the walkerOS.json convention yet.`,
      );
    }
    const walkerOSJson = (await schemaRes.json()) as Record<string, unknown>;
    const meta = (walkerOSJson.$meta as Record<string, unknown>) || {};

    const schemas = (walkerOSJson.schemas as Record<string, unknown>) || {};
    const examples = (walkerOSJson.examples as Record<string, unknown>) || {};
    const hints = walkerOSJson.hints as Record<string, unknown> | undefined;

    // Extract hint keys
    const hintKeys = hints ? Object.keys(hints) : [];

    // Extract example summaries from step examples
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
  } finally {
    clearTimeout(timer);
  }
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
