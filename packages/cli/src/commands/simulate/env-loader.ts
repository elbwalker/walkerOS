interface DestinationEnv {
  init?: Record<string, unknown>;
  push: Record<string, unknown>;
  simulation?: string[];
}

interface DestinationConfig {
  package?: string;
  config?: Record<string, unknown>;
}

/**
 * Dynamically loads env examples from destination packages.
 *
 * Imports from `/dev` subpath (e.g., '@walkeros/web-destination-gtag/dev')
 * and extracts the `env` object which contains:
 * - push: Mock environment with API functions (gtag, fbq, etc.)
 * - simulation: Array of tracking paths for call verification
 *
 * @param destinations - Destination configuration from flow config
 * @returns Map of destination key to env object
 */
export async function loadDestinationEnvs(
  destinations: Record<string, unknown>,
): Promise<Record<string, DestinationEnv>> {
  const envs: Record<string, DestinationEnv> = {};

  for (const [destKey, destConfig] of Object.entries(destinations)) {
    const typedConfig = destConfig as DestinationConfig;

    // Skip if no package field
    if (!typedConfig.package) {
      continue;
    }

    try {
      // Determine import path
      const packageName = typedConfig.package;
      const isDemoPackage = packageName.includes('-demo');
      const importPath = isDemoPackage ? packageName : `${packageName}/dev`;

      // Dynamic import
      const module = await import(importPath);

      // Extract env from examples
      const examplesModule = module.examples || module.default?.examples;
      const envModule = examplesModule?.env;

      if (envModule?.push) {
        envs[destKey] = {
          init: envModule.init,
          push: envModule.push,
          simulation: envModule.simulation || [],
        };
      }
    } catch (error) {
      // Silently skip destinations without env or invalid packages
      // eslint-disable-next-line no-console
      console.warn(
        `Warning: Could not load env for destination "${destKey}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return envs;
}
