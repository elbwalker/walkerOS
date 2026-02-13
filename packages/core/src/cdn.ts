const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/npm';
const DEFAULT_SCHEMA_PATH = 'dist/dev/walkerOS.json';

export interface WalkerOSPackageInfo {
  packageName: string;
  version: string;
  type?: string;
  platform?: string;
  schemas: Record<string, unknown>;
  examples: Record<string, unknown>;
}

export async function fetchPackageSchema(
  packageName: string,
  options?: { version?: string; timeout?: number },
): Promise<WalkerOSPackageInfo> {
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

    // Read walkerOS metadata
    const walkerOS = pkg.walkerOS as
      | { type?: string; platform?: string; schema?: string }
      | undefined;

    // Resolve schema path
    const schemaPath = (walkerOS?.schema || `./${DEFAULT_SCHEMA_PATH}`).replace(
      /^\.\//,
      '',
    );

    // Fetch walkerOS.json
    const schemaRes = await fetch(`${base}/${schemaPath}`, {
      signal: controller.signal,
    });
    if (!schemaRes.ok) {
      throw new Error(
        `walkerOS.json not found at ${schemaPath} (HTTP ${schemaRes.status}). ` +
          `This package may not support the walkerOS.json convention yet.`,
      );
    }
    const walkerOSJson = (await schemaRes.json()) as Record<string, unknown>;

    return {
      packageName,
      version: (pkg.version as string) || ver,
      type: walkerOS?.type,
      platform: walkerOS?.platform,
      schemas: (walkerOSJson.schemas as Record<string, unknown>) || {},
      examples: (walkerOSJson.examples as Record<string, unknown>) || {},
    };
  } finally {
    clearTimeout(timer);
  }
}
