import ciInfo from 'ci-info';

export interface CiInfo {
  ci: boolean;
  ci_name?: string;
}

interface CiInput {
  isCI: boolean;
  name?: string | null;
}

/**
 * CI environment detection. Accepts an injected input for testability;
 * production callers pass no argument and `ci-info` is read directly.
 */
export function getCiInfo(input?: CiInput): CiInfo {
  const isCI = input?.isCI ?? ciInfo.isCI;
  // Use property presence (not nullishness) so callers can pass `name: null`
  // explicitly to mean "vendor unknown" without falling through to ciInfo.name.
  const name = input && 'name' in input ? input.name : (ciInfo.name ?? null);
  if (!isCI) return { ci: false };
  return name ? { ci: true, ci_name: name } : { ci: true };
}
