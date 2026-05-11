import { resolveVersionConflicts, type VersionSpec } from '../package-manager';
import { createMockLogger } from '@walkeros/core';
import * as pacote from 'pacote';

describe('resolveVersionConflicts — range conflicts', () => {
  const logger = createMockLogger();

  // Mock pacote.manifest so tests don't hit the real npm registry.
  beforeEach(() => {
    jest.spyOn(pacote, 'manifest').mockImplementation(async (spec: string) => {
      const [name, range] = String(spec).split('@').filter(Boolean);
      const fakeName = name.startsWith('@') ? `@${name}` : name;
      if (fakeName === 'arrify') {
        if (range === '^3.0.0' || range === '*' || range === 'latest')
          return { name: 'arrify', version: '3.0.0' } as never;
        if (range === '^2.0.0')
          return { name: 'arrify', version: '2.0.1' } as never;
        if (range === '^1.0.0')
          return { name: 'arrify', version: '1.0.1' } as never;
      }
      throw new Error(`mock pacote.manifest: unknown spec ${spec}`);
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('nests a non-intersecting range under its consumer (arrify-shape)', async () => {
    const allSpecs = new Map<string, VersionSpec[]>([
      [
        'arrify',
        [
          {
            spec: '^3.0.0',
            source: 'dependency',
            from: '@google-cloud/bigquery',
            optional: false,
          },
          {
            spec: '^2.0.0',
            source: 'dependency',
            from: '@google-cloud/common',
            optional: false,
          },
        ],
      ],
    ]);

    const result = await resolveVersionConflicts(allSpecs, logger);

    const topLevelArrify = result.topLevel.get('arrify');
    expect(topLevelArrify).toBeDefined();

    const losingRange =
      topLevelArrify!.version === '^3.0.0' ? '^2.0.0' : '^3.0.0';
    const losingConsumer =
      losingRange === '^2.0.0'
        ? '@google-cloud/common'
        : '@google-cloud/bigquery';

    const nested = result.nested.find(
      (n) => n.name === 'arrify' && n.version === losingRange,
    );
    expect(nested).toBeDefined();
    expect(nested!.consumers).toContain(losingConsumer);
  });

  it('nests a narrower range when chosen wildcard resolves to a non-satisfying concrete', async () => {
    // arrify@* → 3.0.0 (mocked) → does NOT satisfy ^1.0.0
    const allSpecs = new Map<string, VersionSpec[]>([
      [
        'arrify',
        [
          { spec: '*', source: 'dependency', from: 'pkg-a', optional: false },
          {
            spec: '^1.0.0',
            source: 'dependency',
            from: 'pkg-b',
            optional: false,
          },
        ],
      ],
    ]);
    const result = await resolveVersionConflicts(allSpecs, logger);
    expect(
      result.nested.some((n) => n.name === 'arrify' && n.version === '^1.0.0'),
    ).toBe(true);
  });

  it('does not nest when ranges intersect and concrete satisfies all', async () => {
    // Both ranges resolve to highest matching 2.x via the mock — satisfies both
    const allSpecs = new Map<string, VersionSpec[]>([
      [
        'arrify',
        [
          {
            spec: '^2.0.0',
            source: 'dependency',
            from: 'pkg-a',
            optional: false,
          },
          {
            spec: '^2.0.0',
            source: 'dependency',
            from: 'pkg-b',
            optional: false,
          },
        ],
      ],
    ]);
    const result = await resolveVersionConflicts(allSpecs, logger);
    expect(result.nested.find((n) => n.name === 'arrify')).toBeUndefined();
  });

  it('handles 3+ non-overlapping clusters', async () => {
    const allSpecs = new Map<string, VersionSpec[]>([
      [
        'arrify',
        [
          {
            spec: '^1.0.0',
            source: 'dependency',
            from: 'pkg-a',
            optional: false,
          },
          {
            spec: '^2.0.0',
            source: 'dependency',
            from: 'pkg-b',
            optional: false,
          },
          {
            spec: '^3.0.0',
            source: 'dependency',
            from: 'pkg-c',
            optional: false,
          },
        ],
      ],
    ]);
    const result = await resolveVersionConflicts(allSpecs, logger);
    // Top-level wins one; the other two get nested.
    expect(result.topLevel.has('arrify')).toBe(true);
    const nestedArrify = result.nested.filter((n) => n.name === 'arrify');
    expect(nestedArrify).toHaveLength(2);
  });

  it('skips non-semver loser specs without nesting', async () => {
    // 'latest' is a tag, not a semver — our resolver must not nest it
    const allSpecs = new Map<string, VersionSpec[]>([
      [
        'arrify',
        [
          {
            spec: '^2.0.0',
            source: 'dependency',
            from: 'pkg-a',
            optional: false,
          },
          {
            spec: 'latest',
            source: 'dependency',
            from: 'pkg-b',
            optional: false,
          },
        ],
      ],
    ]);
    const result = await resolveVersionConflicts(allSpecs, logger);
    expect(
      result.nested.find((n) => n.name === 'arrify' && n.version === 'latest'),
    ).toBeUndefined();
  });
});

describe('resolveVersionConflicts — manifest failure', () => {
  const logger = createMockLogger();
  let originalStrict: string | undefined;

  beforeEach(() => {
    originalStrict = process.env.BUNDLER_STRICT_RANGES;
    jest
      .spyOn(pacote, 'manifest')
      .mockRejectedValue(new Error('mock registry unreachable'));
  });
  afterEach(() => {
    if (originalStrict === undefined) delete process.env.BUNDLER_STRICT_RANGES;
    else process.env.BUNDLER_STRICT_RANGES = originalStrict;
    jest.restoreAllMocks();
  });

  it('throws when manifest fails and strict mode is on (default)', async () => {
    delete process.env.BUNDLER_STRICT_RANGES;
    const allSpecs = new Map<string, VersionSpec[]>([
      [
        'somepkg',
        [
          { spec: '^1.0.0', source: 'dependency', from: 'a', optional: false },
          { spec: '^2.0.0', source: 'dependency', from: 'b', optional: false },
        ],
      ],
    ]);
    await expect(resolveVersionConflicts(allSpecs, logger)).rejects.toThrow(
      /Failed to resolve.*for range conflict validation/,
    );
  });

  it('falls back to range-as-version when BUNDLER_STRICT_RANGES=0 and manifest fails', async () => {
    process.env.BUNDLER_STRICT_RANGES = '0';
    const allSpecs = new Map<string, VersionSpec[]>([
      [
        'somepkg',
        [
          { spec: '^1.0.0', source: 'dependency', from: 'a', optional: false },
          { spec: '^2.0.0', source: 'dependency', from: 'b', optional: false },
        ],
      ],
    ]);
    const result = await resolveVersionConflicts(allSpecs, logger);
    const entry = result.topLevel.get('somepkg');
    expect(entry).toBeDefined();
    expect(entry!.version).toMatch(/^\^[12]\.0\.0$/);
  });
});
