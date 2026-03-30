/**
 * Check if a config value contains code markers that require esbuild compilation.
 * Returns true if the value (or any nested value) contains:
 * - $code: prefix (raw JS expression)
 * - $store: prefix (JS variable reference)
 * - __WALKEROS_ENV: prefix (process.env expression)
 */
export function containsCodeMarkers(value: unknown): boolean {
  if (typeof value === 'string') {
    return (
      value.startsWith('$code:') ||
      value.startsWith('$store:') ||
      value.includes('__WALKEROS_ENV:')
    );
  }
  if (Array.isArray(value)) {
    return value.some(containsCodeMarkers);
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(
      containsCodeMarkers,
    );
  }
  return false;
}

/**
 * Split a step's properties into code-layer (for esbuild) and data-layer (post-build).
 *
 * Code layer: 'code' key always, plus any property containing code markers
 * Data layer: plain JSON values (settings, mappings, chains, etc.)
 *
 * Not applicable to InlineCode steps — those go entirely to the code layer.
 */
export function classifyStepProperties(
  step: Record<string, unknown>,
): { codeProps: Record<string, unknown>; dataProps: Record<string, unknown> } {
  const codeProps: Record<string, unknown> = {};
  const dataProps: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(step)) {
    if (key === 'code') {
      codeProps[key] = value;
      continue;
    }
    if (containsCodeMarkers(value)) {
      codeProps[key] = value;
    } else {
      dataProps[key] = value;
    }
  }

  return { codeProps, dataProps };
}
