import type { GeneratorInput, GeneratorOutput } from './types';
import { GeneratorError } from './types';
import { parseFlowConfig } from './core/parser';
import { resolvePackages } from './core/resolver';
import { generateBundle } from './core/bundler';

/**
 * Generate walkerOS bundle from Flow configuration
 */
export async function generateWalkerOSBundle(
  input: GeneratorInput,
): Promise<GeneratorOutput> {
  try {
    // 1. Parse and validate Flow configuration
    const config = parseFlowConfig(input.flow);

    // 2. Resolve packages
    const resolvedPackages = await resolvePackages(
      config.packages,
      input.cacheOptions,
    );

    // 3. Generate bundle
    const bundle = await generateBundle(config, resolvedPackages);

    return { bundle };
  } catch (error) {
    if (error instanceof GeneratorError) {
      throw error;
    }
    throw new GeneratorError(
      'Unexpected error during bundle generation',
      'UNKNOWN_ERROR',
      { error },
    );
  }
}

// Export types
export type * from './types';

// Export utility functions
export { parseFlowConfig } from './core/parser';
export { resolvePackages } from './core/resolver';
export { generateBundle } from './core/bundler';

// Export error classes
export { GeneratorError, ParseError, ResolveError, BundleError } from './types';
