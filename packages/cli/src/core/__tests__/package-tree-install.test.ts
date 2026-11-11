import crypto from 'crypto';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import pacote from 'pacote';
import semver from 'semver';
import { createMockLogger } from '@walkeros/core';
import {
  PACOTE_OPTS,
  PackageUnavailableError,
  downloadPackagesWithResolution,
  installPackageTree,
  type Cooldown,
} from '../package-manager';
import {
  PackageTreeError,
  assertPackageTree,
  type PackageTree,
} from '../package-tree';

const REGISTRY = 'https://registry.npmjs.org/';
const BEFORE = new Date('2026-11-03T12:00:00.000Z');
const OLD = '2026-01-01T00:00:00.000Z';
const FRESH = '2026-11-09T00:00:00.000Z';

interface FakeVersion {
  time?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  /** The registry's integrity: sha512 unless set (`sha1` for old publishes). */
  integrity?: 'sha1';
}
type FakeRegistry = Record<string, Record<string, FakeVersion>>;

const tarballOf = (name: string, version: string) =>
  `${REGISTRY}${name}/-/${name.includes('/') ? name.split('/')[1] : name}-${version}.tgz`;
const bytesOf = (name: string, version: string) =>
  Buffer.from(`${name}@${version}`);
const sha512 = (bytes: Buffer) =>
  `sha512-${crypto.createHash('sha512').update(bytes).digest('base64')}`;
const sha1 = (bytes: Buffer) =>
  `sha1-${crypto.createHash('sha1').update(bytes).digest('base64')}`;

/** `name@range`, or an alias `key@npm:name@range`, as name and range. */
function splitSpec(spec: string): { name: string; range: string } {
  const at = spec.indexOf('@', 1);
  const name = spec.slice(0, at);
  const rest = spec.slice(at + 1);
  if (rest.startsWith('npm:')) return splitSpec(rest.slice('npm:'.length));
  return { name, range: rest };
}

/** A typed pacote manifest for `name@version` of the fake registry. */
function manifestOf(
  registry: FakeRegistry,
  spec: string,
  name: string,
  version: string,
): pacote.AbbreviatedManifest & pacote.ManifestResult {
  const meta = registry[name][version];
  const bytes = bytesOf(name, version);
  const manifest: pacote.AbbreviatedManifest & pacote.ManifestResult = {
    name,
    version,
    deprecated: undefined,
    dependencies: meta.dependencies ?? {},
    ...(meta.peerDependencies
      ? { peerDependencies: meta.peerDependencies }
      : {}),
    dist: { tarball: tarballOf(name, version), shasum: '' },
    _from: spec,
    _resolved: tarballOf(name, version),
    _integrity: meta.integrity === 'sha1' ? sha1(bytes) : sha512(bytes),
    _id: `${name}@${version}`,
  };
  return meta.time ? Object.assign(manifest, { _time: meta.time }) : manifest;
}

function errorWithCode(code: string, message = code): Error {
  return Object.assign(new Error(message), { code });
}

interface Calls {
  manifests: Array<{ spec: string; before: Date | undefined }>;
  extracts: Array<{ spec: string; dest: string; integrity: unknown }>;
  tarballs: string[];
  packuments: number;
}

/**
 * pacote against an in-memory registry: `manifest` picks like npm (the
 * highest satisfying version, at or before `before` when set), `extract`
 * writes the package's own package.json, `tarball` returns its bytes.
 */
function fakePacote(registry: FakeRegistry): Calls {
  const calls: Calls = {
    manifests: [],
    extracts: [],
    tarballs: [],
    packuments: 0,
  };
  const byUrl = new Map<string, { name: string; version: string }>();
  for (const [name, versions] of Object.entries(registry)) {
    for (const version of Object.keys(versions)) {
      byUrl.set(tarballOf(name, version), { name, version });
    }
  }

  jest.spyOn(pacote, 'manifest').mockImplementation(async (spec, opts) => {
    const before = opts?.before ?? undefined;
    calls.manifests.push({ spec, before: before ?? undefined });
    const { name, range } = splitSpec(spec);
    const versions = registry[name];
    if (!versions) throw errorWithCode('E404');
    const eligible = Object.keys(versions).filter((version) => {
      const time = versions[version].time;
      return (
        !before || time === undefined || Date.parse(time) <= before.getTime()
      );
    });
    const version = semver.maxSatisfying(eligible, range || '*');
    if (version === null)
      throw errorWithCode('ETARGET', `No matching version for ${spec}`);
    return manifestOf(registry, spec, name, version);
  });

  jest.spyOn(pacote, 'extract').mockImplementation(async (spec, dest, opts) => {
    calls.extracts.push({ spec, dest: dest ?? '', integrity: opts?.integrity });
    const pkg = byUrl.get(spec) ?? pickFromSpec(registry, spec);
    if (!pkg) throw errorWithCode('E404');
    const bytes = bytesOf(pkg.name, pkg.version);
    const expected = opts?.integrity;
    if (
      typeof expected === 'string' &&
      expected !== sha512(bytes) &&
      expected !== sha1(bytes)
    ) {
      throw Object.assign(errorWithCode('EINTEGRITY'), {
        found: sha512(bytes),
      });
    }
    const meta = registry[pkg.name][pkg.version];
    await fs.outputJson(path.join(dest ?? '', 'package.json'), {
      name: pkg.name,
      version: pkg.version,
      dependencies: meta.dependencies,
      peerDependencies: meta.peerDependencies,
    });
    // pacote reports sha512 over the fetched bytes, plus the expected sha1.
    const integrity =
      meta.integrity === 'sha1' ? `${sha1(bytes)}` : sha512(bytes);
    return { from: spec, resolved: spec, integrity };
  });

  jest.spyOn(pacote, 'tarball').mockImplementation(async (spec) => {
    calls.tarballs.push(spec);
    const pkg = byUrl.get(spec);
    if (!pkg) throw errorWithCode('E404');
    return Object.assign(bytesOf(pkg.name, pkg.version), {
      from: spec,
      resolved: spec,
      integrity: '',
    });
  });

  jest.spyOn(pacote, 'packument').mockImplementation(async () => {
    calls.packuments++;
    throw new Error('no packument read is allowed here');
  });
  return calls;
}

/** A registry spec (`name@range`) as the plain resolver extracts it. */
function pickFromSpec(
  registry: FakeRegistry,
  spec: string,
): { name: string; version: string } | undefined {
  if (spec.startsWith('https://')) return undefined;
  const { name, range } = splitSpec(spec);
  const version = semver.maxSatisfying(
    Object.keys(registry[name] ?? {}),
    range || '*',
  );
  return version === null ? undefined : { name, version };
}

const logger = createMockLogger();
const cooldown: Cooldown = { before: BEFORE, exempt: ['@walkeros/'] };
let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-tree-'));
  process.env.NPM_CACHE_DIR = path.join(dir, 'cache');
});
afterEach(async () => {
  jest.restoreAllMocks();
  delete process.env.NPM_CACHE_DIR;
  await fs.remove(dir);
});

/** A first-party package at a fresh release with a third-party edge. */
const REGISTRY_FIXTURE: FakeRegistry = {
  '@walkeros/server-destination-gcp': {
    '4.9.0': {
      time: FRESH,
      dependencies: {
        '@walkeros/core': '4.9.0',
        bigquery: '^8.1.0',
        pinned: '2.0.0',
      },
    },
  },
  '@walkeros/core': { '4.9.0': { time: FRESH } },
  bigquery: {
    '8.1.0': { time: OLD, dependencies: { arrify: '^2.0.0', exact: '1.0.0' } },
    '8.2.0': { time: FRESH, dependencies: { arrify: '^2.0.0' } },
  },
  arrify: { '2.0.1': { time: OLD }, '3.0.0': { time: OLD } },
  pinned: { '2.0.0': { time: FRESH } },
  exact: { '1.0.0': { time: OLD } },
};

const resolveGcp = (
  registry: FakeRegistry = REGISTRY_FIXTURE,
  cool?: Cooldown,
) =>
  downloadPackagesWithResolution(
    [{ name: '@walkeros/server-destination-gcp', version: '4.9.0' }],
    dir,
    logger,
    false,
    undefined,
    dir,
    {},
    PACOTE_OPTS,
    cool,
  );

describe('resolve under a cooldown', () => {
  it('applies the cutoff per edge and records what it extracted', async () => {
    const calls = fakePacote(REGISTRY_FIXTURE);
    const { tree } = await resolveGcp(REGISTRY_FIXTURE, cooldown);

    // Exempt: the first-party names, and the exact third-party pin a
    // first-party package declares. Cut off: the third-party range.
    const cut = (spec: string) =>
      calls.manifests.filter((c) => c.spec === spec).map((c) => c.before);
    expect(cut('@walkeros/server-destination-gcp@4.9.0')).not.toContain(BEFORE);
    expect(cut('@walkeros/core@4.9.0')).not.toContain(BEFORE);
    expect(cut('pinned@2.0.0')).not.toContain(BEFORE);
    expect(cut('bigquery@^8.1.0')).toEqual(expect.arrayContaining([BEFORE]));
    expect(cut('bigquery@^8.1.0')).not.toContain(undefined);
    expect(cut('exact@1.0.0')).toEqual(expect.arrayContaining([BEFORE]));

    expect(tree?.packages['node_modules/bigquery']).toEqual({
      name: 'bigquery',
      version: '8.1.0',
      resolved: tarballOf('bigquery', '8.1.0'),
      integrity: sha512(bytesOf('bigquery', '8.1.0')),
      dependencies: { arrify: '^2.0.0', exact: '1.0.0' },
    });
    expect(tree?.before).toBe(BEFORE.toISOString());
    // Every extract is the picked tarball URL with the registry's integrity.
    expect(calls.extracts.map((c) => c.spec)).toContain(
      tarballOf('bigquery', '8.1.0'),
    );
    expect(calls.extracts.every((c) => typeof c.integrity === 'string')).toBe(
      true,
    );
    expect(
      tree &&
        assertPackageTree(tree, {
          registry: REGISTRY,
          exempt: cooldown.exempt,
        }),
    ).toEqual(tree);
  });

  it('records nested copies at the consumer path', async () => {
    const registry: FakeRegistry = {
      ...REGISTRY_FIXTURE,
      '@walkeros/server-destination-gcp': {
        '4.9.0': {
          time: FRESH,
          dependencies: { bigquery: '^8.1.0', arrify: '^3.0.0' },
        },
      },
    };
    fakePacote(registry);
    const { tree } = await resolveGcp(registry, cooldown);

    expect(tree?.packages['node_modules/arrify']?.version).toBe('3.0.0');
    expect(
      tree?.packages['node_modules/bigquery/node_modules/arrify']?.version,
    ).toBe('2.0.1');
  });

  it.each([
    ['has no publish time', undefined, /has no publish time/],
    [
      'was published after the cutoff',
      FRESH,
      /was published 2026-11-09T00:00:00.000Z, after 2026-11-03T12:00:00.000Z/,
    ],
  ])('refuses a pick that %s', async (_name, time, message) => {
    const registry: FakeRegistry = {
      ...REGISTRY_FIXTURE,
      bigquery: { '8.1.0': REGISTRY_FIXTURE.bigquery['8.1.0'] },
      arrify: { '2.0.1': time ? { time } : {} },
    };
    const calls = fakePacote(registry);
    // The fake picker admits a version without a time, as npm-pick-manifest does.
    jest.spyOn(pacote, 'manifest').mockImplementation(async (spec, opts) => {
      calls.manifests.push({ spec, before: opts?.before ?? undefined });
      const { name } = splitSpec(spec);
      const version = Object.keys(registry[name] ?? {}).sort(
        semver.rcompare,
      )[0];
      if (!version) throw errorWithCode('E404');
      return manifestOf(registry, spec, name, version);
    });
    await expect(resolveGcp(registry, cooldown)).rejects.toThrow(message);
  });

  it('names the cutoff when no version satisfies a range under it', async () => {
    const registry: FakeRegistry = {
      ...REGISTRY_FIXTURE,
      bigquery: { '8.2.0': { time: FRESH } },
    };
    fakePacote(registry);
    await expect(resolveGcp(registry, cooldown)).rejects.toThrow(
      'No version of bigquery@^8.1.0 (from @walkeros/server-destination-gcp) was published at or before 2026-11-03T12:00:00.000Z',
    );
  });

  it('refuses an alias that borrows an exempt name', async () => {
    const registry: FakeRegistry = {
      ...REGISTRY_FIXTURE,
      bigquery: {
        '8.1.0': {
          time: OLD,
          dependencies: { '@walkeros/web-core': 'npm:evil@1.0.0' },
        },
      },
      evil: { '1.0.0': { time: FRESH } },
    };
    const calls = fakePacote(registry);
    await expect(resolveGcp(registry, cooldown)).rejects.toThrow(
      PackageTreeError,
    );
    expect(calls.manifests.map((c) => c.spec)).not.toContain(
      '@walkeros/web-core@npm:evil@1.0.0',
    );
  });

  it('records a computed sha512 when the registry offers only a sha1', async () => {
    const registry: FakeRegistry = {
      ...REGISTRY_FIXTURE,
      exact: { '1.0.0': { time: OLD, integrity: 'sha1' } },
    };
    const calls = fakePacote(registry);
    const { tree } = await resolveGcp(registry, cooldown);

    expect(calls.tarballs).toEqual([tarballOf('exact', '1.0.0')]);
    expect(tree?.packages['node_modules/exact']?.integrity).toBe(
      sha512(bytesOf('exact', '1.0.0')),
    );
  });

  it('fails on a manifest miss instead of leaving the edge out', async () => {
    const registry: FakeRegistry = { ...REGISTRY_FIXTURE };
    delete registry.exact;
    const calls = fakePacote(registry);
    await expect(resolveGcp(registry, cooldown)).rejects.toThrow('E404');
    // It fails while resolving, before anything is installed.
    expect(calls.extracts).toEqual([]);
  });

  it('resolves as before without a cooldown: no cutoff and no tree', async () => {
    const calls = fakePacote(REGISTRY_FIXTURE);
    const { tree } = await resolveGcp();

    expect(tree).toBeUndefined();
    expect(calls.manifests.every((c) => c.before === undefined)).toBe(true);
  });
});

describe('installPackageTree', () => {
  const recorded = async (): Promise<PackageTree> => {
    fakePacote(REGISTRY_FIXTURE);
    const { tree } = await resolveGcp(REGISTRY_FIXTURE, cooldown);
    jest.restoreAllMocks();
    await fs.emptyDir(dir);
    if (!tree) throw new Error('no tree');
    return tree;
  };
  const declared = { '@walkeros/server-destination-gcp': '4.9.0' };

  it('installs every entry from its tarball URL and reads no manifest', async () => {
    const tree = await recorded();
    const calls = fakePacote(REGISTRY_FIXTURE);
    const paths = await installPackageTree(tree, dir, logger, {
      npmConfig: PACOTE_OPTS,
      declared,
    });

    expect(calls.manifests).toEqual([]);
    expect(calls.packuments).toBe(0);
    expect(calls.extracts.map((c) => [c.spec, c.integrity])).toEqual(
      expect.arrayContaining(
        Object.values(tree.packages).map((entry) => [
          entry.resolved,
          entry.integrity,
        ]),
      ),
    );
    expect(paths.get('bigquery')).toBe(path.join(dir, 'node_modules/bigquery'));
  });

  it.each([
    [
      'a tree naming another registry',
      (t: PackageTree) => ({ ...t, registry: 'https://registry.evil.test/' }),
    ],
    [
      'a resolved URL on another host',
      (t: PackageTree) => ({
        ...t,
        packages: {
          ...t.packages,
          'node_modules/arrify': {
            ...t.packages['node_modules/arrify'],
            resolved: 'https://registry.evil.test/arrify/-/arrify-2.0.1.tgz',
          },
        },
      }),
    ],
  ])('refuses %s before any fetch', async (_name, doctor) => {
    const tree = doctor(await recorded());
    const calls = fakePacote(REGISTRY_FIXTURE);
    await expect(
      installPackageTree(tree, dir, logger, {
        npmConfig: PACOTE_OPTS,
        declared,
      }),
    ).rejects.toThrow(PackageTreeError);
    expect(calls.extracts).toEqual([]);
  });

  it.each([
    [
      'serves other bytes',
      (t: PackageTree): PackageTree => ({
        ...t,
        packages: {
          ...t.packages,
          'node_modules/arrify': {
            ...t.packages['node_modules/arrify'],
            integrity: sha512(Buffer.from('doctored')),
          },
        },
      }),
      /Recorded package arrify@2\.0\.1 \(node_modules\/arrify\) could not be installed: integrity sha512-\S+ recorded, sha512-\S+ received/,
    ],
    [
      'no longer serves it',
      (t: PackageTree): PackageTree => t,
      /Recorded package arrify@2\.0\.1 \(node_modules\/arrify\) could not be installed: the registry does not serve it/,
    ],
  ])('fails closed when the registry %s', async (name, doctor, message) => {
    const tree = doctor(await recorded());
    const registry: FakeRegistry = { ...REGISTRY_FIXTURE };
    if (name === 'no longer serves it') registry.arrify = {};
    fakePacote(registry);
    const install = installPackageTree(tree, dir, logger, {
      npmConfig: PACOTE_OPTS,
      declared,
    });
    await expect(install).rejects.toThrow(PackageUnavailableError);
    await expect(install).rejects.toThrow(message);
  });

  it('refuses a tree whose installed packages declare an edge it lacks', async () => {
    const tree = await recorded();
    const registry: FakeRegistry = {
      ...REGISTRY_FIXTURE,
      arrify: {
        ...REGISTRY_FIXTURE.arrify,
        '2.0.1': { time: OLD, dependencies: { 'is-missing': '^1.0.0' } },
      },
    };
    const calls = fakePacote(registry);
    await expect(
      installPackageTree(tree, dir, logger, {
        npmConfig: PACOTE_OPTS,
        declared,
      }),
    ).rejects.toThrow(
      /node_modules\/arrify: dependency is-missing@\^1\.0\.0 has no is-missing in the tree/,
    );
    expect(calls.manifests).toEqual([]);
  });
});
