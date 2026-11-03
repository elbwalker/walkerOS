import type { Flow } from './types';
import { isObject } from './is';

/**
 * The types of a step package (`walkerOS.type` in its package.json). A step
 * package publishes an exports list, empty when it declares none, and a
 * settings schema; the build checks both.
 */
export const STEP_TYPES = [
  'source',
  'transformer',
  'destination',
  'store',
] as const;

/**
 * Where a destination package keeps its minimal example, relative to `src`
 * (per export: `src/<export>/examples/minimal.ts`). A package with the file
 * renders a quickstart on its docs page; its conformance test runs it.
 */
export const MINIMAL_EXAMPLE_FILE = 'examples/minimal.ts';

/** Whether a value maps names to strings, as declared exports do. */
export function isStringRecord(
  value: unknown,
): value is Record<string, string> {
  return (
    isObject(value) &&
    Object.values(value).every((entry) => typeof entry === 'string')
  );
}

/** A platform as a list: one platform string, or a list of them. */
function platformsOf(value: unknown): string[] | undefined {
  if (typeof value === 'string') return [value];
  if (
    Array.isArray(value) &&
    value.every((entry): entry is string => typeof entry === 'string')
  )
    return value;
  return undefined;
}

/**
 * The `$meta` of a walkerOS.json: every field of `Flow.PackageMeta` that has
 * its published type, a single platform string as a list.
 */
export function parsePackageMeta(value: unknown): Partial<Flow.PackageMeta> {
  if (!isObject(value)) return {};
  const text = (key: string) =>
    typeof value[key] === 'string' ? { [key]: value[key] } : {};
  const platform = platformsOf(value.platform);
  return {
    ...text('package'),
    ...text('version'),
    ...text('type'),
    ...(platform && { platform }),
    ...text('renderer'),
    ...(isStringRecord(value.exports) && { exports: value.exports }),
    ...text('docs'),
    ...text('source'),
  };
}

/**
 * The `$meta` a package publishes in its walkerOS.json, from its
 * package.json: its name and version, the `walkerOS` block (type, platform
 * as a list, renderer, exports, docs) and the source URL its repository
 * directory gives. A step package without declared exports publishes an
 * empty list, so a reader can tell it from an older package that published
 * none. The build writes it; the conformance kit composes from it.
 */
export function packageMetaOf(packageJson: unknown): Flow.PackageMeta {
  const pkg = isObject(packageJson) ? packageJson : {};
  const { name, version } = pkg;
  if (typeof name !== 'string' || !name)
    throw new Error('package.json names no package');
  if (typeof version !== 'string' || !version)
    throw new Error(`${name}: package.json names no version`);

  const { type, platform, renderer, exports, docs } = parsePackageMeta(
    pkg.walkerOS,
  );
  const meta: Flow.PackageMeta = { package: name, version };
  if (type) meta.type = type;
  if (platform) meta.platform = platform;
  if (renderer) meta.renderer = renderer;
  const published =
    exports ??
    (STEP_TYPES.some((stepType) => stepType === type) ? {} : undefined);
  if (published) meta.exports = published;
  if (docs) meta.docs = docs;

  const repo = pkg.repository;
  if (isObject(repo) && typeof repo.directory === 'string' && repo.directory) {
    const url = (typeof repo.url === 'string' ? repo.url : '')
      .replace(/^git\+/, '')
      .replace(/\.git$/, '');
    if (url) meta.source = `${url}/tree/main/${repo.directory}/src`;
  }
  return meta;
}
