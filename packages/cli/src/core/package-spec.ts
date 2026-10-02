/**
 * Spec-type gate for every package spec the bundler hands to pacote.
 *
 * pacote picks a fetcher from the spec TYPE, and two of those fetchers run
 * code: the git fetcher prepares a clone with a full `npm install`, and the
 * directory fetcher (behind `file:`) runs the package's `prepare` script. So
 * the only specs allowed to reach pacote are registry fetches: a `version`,
 * `range` or `tag`. Everything else (`git`, `github:`, `file:`, `link:`,
 * directories, tarball URLs, `npm:` aliases) is refused before any network
 * call.
 *
 * Local packages are not specs: `config.bundle.packages[x].path` and step
 * packages beginning with `.` or `/` are copied from disk by the CLI and never
 * reach pacote, so they are not gated here.
 *
 * Transitive dependencies are gated too, because an override or a direct pin
 * can select a version whose own dependencies carry a git spec. A transitive
 * `npm:` alias is allowed when its target is itself a registry spec: real
 * published packages use them, and pacote resolves them from the registry.
 */

import npa from 'npm-package-arg';

/** Spec types that fetch from the npm registry, the only ones allowed. */
const REGISTRY_SPEC_TYPES: ReadonlySet<string> = new Set([
  'version',
  'range',
  'tag',
]);

export interface SpecCheck {
  name: string;
  spec: string;
  /** Where the spec came from, for the error message (e.g. `flow.json`). */
  from: string;
}

/**
 * True when `name@spec` is a registry fetch for exactly `name`.
 * `allowAlias` admits an `npm:` alias whose target is a registry spec.
 */
export function isRegistrySpec(
  name: string,
  spec: string,
  allowAlias = false,
): boolean {
  try {
    const parsed = npa.resolve(name, spec);
    if (REGISTRY_SPEC_TYPES.has(parsed.type)) return parsed.name === name;
    if (allowAlias && parsed.type === 'alias') {
      return REGISTRY_SPEC_TYPES.has(parsed.subSpec.type);
    }
    return false;
  } catch {
    // npm-package-arg throws on invalid names, tags and URL protocols.
    return false;
  }
}

/** A package spec that is not a registry version, range or tag. */
export class UnsupportedPackageSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedPackageSpecError';
  }
}

function formatSpec(check: SpecCheck): string {
  return `${check.name}@${check.spec} (from ${check.from})`;
}

/**
 * Throw one error naming every spec a flow declares that is not a registry
 * version, range or tag. Used for direct packages and override values.
 */
export function assertRegistrySpecs(checks: ReadonlyArray<SpecCheck>): void {
  const bad = checks.filter((c) => !isRegistrySpec(c.name, c.spec));
  if (bad.length === 0) return;
  throw new UnsupportedPackageSpecError(
    `Unsupported package spec: ${bad.map(formatSpec).join(', ')}. ` +
      `Only npm registry versions, ranges and tags can be bundled. ` +
      `For a package on disk use config.bundle.packages.<name>.path.`,
  );
}

/** Throw when a transitive dependency spec is not a registry fetch. */
export function assertTransitiveRegistrySpec(check: SpecCheck): void {
  if (isRegistrySpec(check.name, check.spec, true)) return;
  throw new UnsupportedPackageSpecError(
    `Unsupported dependency spec: ${formatSpec(check)}. ` +
      `The bundler only installs dependencies from the npm registry; ` +
      `git, file, directory and URL dependencies are refused because ` +
      `fetching them can run install scripts.`,
  );
}
