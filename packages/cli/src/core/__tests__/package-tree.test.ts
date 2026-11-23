import fs from 'fs';
import path from 'path';
import {
  PACKAGE_TREE_MAX_ENTRIES,
  PackageTreeError,
  aliasCrossesExemption,
  assertPackageTree,
  edgeIsExempt,
  packageTreeDigest,
  packageTreeProblems,
  type PackageTree,
} from '../package-tree';

/**
 * The fixture is shared with the app (`src/lib/bundles/__tests__/fixtures/`):
 * both repos must give every tree the same verdict and digest.
 */
interface FixtureCase {
  id: string;
  verdict: 'valid' | 'invalid';
  digest?: string;
  tree: unknown;
}
interface Fixture {
  options: {
    registry: string;
    declared: Record<string, string>;
    exempt: string[];
  };
  cases: FixtureCase[];
}

const fixture: Fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/package-trees.json'), 'utf8'),
);

describe('packageTreeProblems', () => {
  it.each(fixture.cases.map((c) => [c.id, c] as const))(
    '%s',
    (_id, testCase) => {
      const problems = packageTreeProblems(testCase.tree, fixture.options);
      if (testCase.verdict === 'valid') {
        expect(problems).toEqual([]);
        const tree = assertPackageTree(testCase.tree, fixture.options);
        expect(packageTreeDigest(tree)).toBe(testCase.digest);
      } else {
        expect(problems.length).toBeGreaterThan(0);
        expect(() => assertPackageTree(testCase.tree, fixture.options)).toThrow(
          PackageTreeError,
        );
      }
    },
  );

  it('refuses more entries than the cap', () => {
    const valid = fixture.cases.find((c) => c.verdict === 'valid');
    const tree = assertPackageTree(valid?.tree, fixture.options);
    const entry = tree.packages['node_modules/arrify'];
    const big: PackageTree = {
      ...tree,
      packages: { ...tree.packages },
    };
    for (let i = 0; i <= PACKAGE_TREE_MAX_ENTRIES; i++) {
      big.packages[`node_modules/pkg-${i}`] = {
        ...entry,
        name: `pkg-${i}`,
        resolved: `https://registry.npmjs.org/pkg-${i}/-/pkg-${i}-3.0.0.tgz`,
      };
    }
    expect(packageTreeProblems(big, fixture.options)[0]).toMatch(
      /more than 5000/,
    );
  });

  it('checks a scoped name against its scope registry', () => {
    const valid = fixture.cases.find((c) => c.verdict === 'valid');
    const options = {
      ...fixture.options,
      scopeRegistries: { '@walkeros': 'https://npm.example.test/' },
    };
    const problems = packageTreeProblems(valid?.tree, options);
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'node_modules/@walkeros/core: resolved https://registry.npmjs.org/',
        ),
      ]),
    );
  });

  it('digests key order away', () => {
    const valid = fixture.cases.find((c) => c.verdict === 'valid');
    const tree = assertPackageTree(valid?.tree, fixture.options);
    const reordered: PackageTree = {
      packages: Object.fromEntries(Object.entries(tree.packages).reverse()),
      before: tree.before,
      registry: tree.registry,
      version: tree.version,
    };
    expect(packageTreeDigest(reordered)).toBe(packageTreeDigest(tree));
  });
});

describe('edgeIsExempt', () => {
  const exempt = ['@walkeros/'];

  it.each([
    [
      'a first-party target, from anyone',
      { name: '@walkeros/core', spec: '^4.0.0', parentName: 'bigquery' },
      true,
    ],
    [
      'a third-party exact a first-party package declares',
      {
        name: 'pinned',
        spec: '2.0.0',
        parentName: '@walkeros/server-destination-gcp',
      },
      true,
    ],
    [
      'a third-party range a first-party package declares',
      {
        name: 'bigquery',
        spec: '^8.1.0',
        parentName: '@walkeros/server-destination-gcp',
      },
      false,
    ],
    [
      'an alias key under the prefix that targets a third party',
      {
        name: '@walkeros/core',
        spec: 'npm:evil@1.0.0',
        parentName: 'bigquery',
      },
      false,
    ],
    [
      'an exact dependency of a third party installed under a first-party path',
      { name: 'exact', spec: '1.0.0', parentName: 'evil' },
      false,
    ],
    [
      'an exact dependency of a third party exempt only by a pin',
      { name: 'x', spec: '1.0.0', parentName: 'pinned' },
      false,
    ],
    ['a direct third-party pin', { name: 'bigquery', spec: '8.1.0' }, false],
  ])('%s', (_name, edge, expected) => {
    expect(edgeIsExempt(edge, exempt)).toBe(expected);
  });

  it('refuses an alias in either direction across the prefix', () => {
    expect(aliasCrossesExemption('@walkeros/core', 'evil', exempt)).toBe(true);
    expect(aliasCrossesExemption('foo', '@walkeros/core', exempt)).toBe(true);
    expect(
      aliasCrossesExemption('string-width-cjs', 'string-width', exempt),
    ).toBe(false);
  });
});
