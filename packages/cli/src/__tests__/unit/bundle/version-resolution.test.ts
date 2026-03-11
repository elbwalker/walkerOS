import pacote from 'pacote';
import { createCLILogger } from '../../../core/cli-logger.js';
import {
  collectAllSpecs,
  resolveVersionConflicts,
  type VersionSpec,
  type Package,
} from '../../../commands/bundle/package-manager.js';

jest.mock('pacote');
const mockManifest = pacote.manifest as jest.MockedFunction<
  typeof pacote.manifest
>;

const logger = createCLILogger({ silent: true });

describe('collectAllSpecs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should collect direct package specs', async () => {
    mockManifest.mockResolvedValue({
      name: '@walkeros/core',
      version: '2.1.1',
      dependencies: {},
    } as any);

    const packages: Package[] = [{ name: '@walkeros/core', version: '2.1.1' }];

    const specs = await collectAllSpecs(packages, logger);
    expect(specs.get('@walkeros/core')).toHaveLength(1);
    expect(specs.get('@walkeros/core')![0]).toMatchObject({
      spec: '2.1.1',
      source: 'direct',
    });
  });

  it('should collect transitive dependency specs', async () => {
    mockManifest.mockImplementation(async (spec: string) => {
      if (spec === '@walkeros/cache@2.2.0') {
        return {
          name: '@walkeros/cache',
          version: '2.2.0',
          dependencies: { '@walkeros/core': '^2.0.0' },
        } as any;
      }
      if (spec === '@walkeros/core@^2.0.0') {
        return {
          name: '@walkeros/core',
          version: '2.1.1',
          dependencies: {},
        } as any;
      }
      throw new Error(`Unexpected spec: ${spec}`);
    });

    const packages: Package[] = [{ name: '@walkeros/cache', version: '2.2.0' }];

    const specs = await collectAllSpecs(packages, logger);
    expect(specs.has('@walkeros/core')).toBe(true);
    expect(specs.get('@walkeros/core')![0]).toMatchObject({
      spec: '^2.0.0',
      source: 'dependency',
      from: '@walkeros/cache',
    });
  });

  it('should collect peerDependency specs separately', async () => {
    mockManifest.mockImplementation(async (spec: string) => {
      if (spec === 'my-transformer@1.0.0') {
        return {
          name: 'my-transformer',
          version: '1.0.0',
          dependencies: {},
          peerDependencies: { '@walkeros/core': '*' },
        } as any;
      }
      if (spec === '@walkeros/core@*') {
        return {
          name: '@walkeros/core',
          version: '2.1.1',
          dependencies: {},
        } as any;
      }
      throw new Error(`Unexpected: ${spec}`);
    });

    const packages: Package[] = [{ name: 'my-transformer', version: '1.0.0' }];

    const specs = await collectAllSpecs(packages, logger);
    expect(specs.get('@walkeros/core')![0]).toMatchObject({
      source: 'peerDependency',
      optional: false,
    });
  });

  it('should mark optional peerDeps via peerDependenciesMeta', async () => {
    mockManifest.mockResolvedValue({
      name: 'posthog-node',
      version: '4.0.0',
      dependencies: {},
      peerDependencies: { rxjs: '^7.0.0' },
      peerDependenciesMeta: { rxjs: { optional: true } },
    } as any);

    const specs = await collectAllSpecs(
      [{ name: 'posthog-node', version: '4.0.0' }],
      logger,
    );
    expect(specs.get('rxjs')![0]).toMatchObject({
      optional: true,
      source: 'peerDependency',
    });
  });

  it('should handle circular deps without infinite loop', async () => {
    mockManifest.mockImplementation(async (spec: string) => {
      if (spec === 'a@1.0.0') {
        return {
          name: 'a',
          version: '1.0.0',
          dependencies: { b: '1.0.0' },
        } as any;
      }
      if (spec === 'b@1.0.0') {
        return {
          name: 'b',
          version: '1.0.0',
          dependencies: { a: '1.0.0' },
        } as any;
      }
      throw new Error(`Unexpected: ${spec}`);
    });

    const specs = await collectAllSpecs(
      [{ name: 'a', version: '1.0.0' }],
      logger,
    );
    expect(specs.has('a')).toBe(true);
    expect(specs.has('b')).toBe(true);
  });

  it('should skip npm packages with local paths', async () => {
    const packages: Package[] = [
      { name: 'my-local', version: 'local', path: './packages/my-local' },
    ];

    const specs = await collectAllSpecs(packages, logger);
    expect(mockManifest).not.toHaveBeenCalled();
    expect(specs.get('my-local')![0]).toMatchObject({
      source: 'direct',
      localPath: './packages/my-local',
    });
  });
});

describe('resolveVersionConflicts', () => {
  it('should dedupe same version from multiple sources', () => {
    const specs = new Map<string, VersionSpec[]>([
      [
        '@walkeros/core',
        [
          {
            spec: '2.1.1',
            source: 'direct',
            from: 'flow.json',
            optional: false,
          },
          {
            spec: '^2.0.0',
            source: 'dependency',
            from: '@walkeros/cache',
            optional: false,
          },
        ],
      ],
    ]);

    const resolved = resolveVersionConflicts(specs, logger);
    expect(resolved.get('@walkeros/core')!.version).toBe('2.1.1');
  });

  it('should use pinned version over wildcard peerDep', () => {
    const specs = new Map<string, VersionSpec[]>([
      [
        '@walkeros/core',
        [
          {
            spec: '2.2.0-next-123',
            source: 'dependency',
            from: '@walkeros/cache',
            optional: false,
          },
          {
            spec: '*',
            source: 'peerDependency',
            from: 'my-transformer',
            optional: false,
          },
        ],
      ],
    ]);

    const resolved = resolveVersionConflicts(specs, logger);
    expect(resolved.get('@walkeros/core')!.version).toBe('2.2.0-next-123');
  });

  it('should skip optional peerDep when nothing else provides it', () => {
    const specs = new Map<string, VersionSpec[]>([
      [
        'rxjs',
        [
          {
            spec: '^7.0.0',
            source: 'peerDependency',
            from: 'posthog-node',
            optional: true,
          },
        ],
      ],
    ]);

    const resolved = resolveVersionConflicts(specs, logger);
    expect(resolved.has('rxjs')).toBe(false);
  });

  it('should install required peerDep when nothing else provides it', () => {
    const specs = new Map<string, VersionSpec[]>([
      [
        'some-dep',
        [
          {
            spec: '^2.0.0',
            source: 'peerDependency',
            from: 'third-party-pkg',
            optional: false,
          },
        ],
      ],
    ]);

    const resolved = resolveVersionConflicts(specs, logger);
    expect(resolved.has('some-dep')).toBe(true);
    expect(resolved.get('some-dep')!.version).toBe('^2.0.0');
  });

  it('should error on two different exact versions from dependencies', () => {
    const specs = new Map<string, VersionSpec[]>([
      [
        '@walkeros/core',
        [
          {
            spec: '2.1.1',
            source: 'dependency',
            from: 'pkg-a',
            optional: false,
          },
          {
            spec: '2.2.0',
            source: 'dependency',
            from: 'pkg-b',
            optional: false,
          },
        ],
      ],
    ]);

    expect(() => resolveVersionConflicts(specs, logger)).toThrow(/conflict/i);
  });

  it('should handle prerelease versions with includePrerelease', () => {
    const specs = new Map<string, VersionSpec[]>([
      [
        '@walkeros/core',
        [
          {
            spec: '2.2.0-next-123',
            source: 'direct',
            from: 'flow.json',
            optional: false,
          },
          {
            spec: '^2.0.0',
            source: 'peerDependency',
            from: 'my-pkg',
            optional: false,
          },
        ],
      ],
    ]);

    const resolved = resolveVersionConflicts(specs, logger);
    expect(resolved.get('@walkeros/core')!.version).toBe('2.2.0-next-123');
  });

  it('should prefer direct packages over transitive', () => {
    const specs = new Map<string, VersionSpec[]>([
      [
        '@walkeros/core',
        [
          {
            spec: '2.1.1',
            source: 'direct',
            from: 'flow.json',
            optional: false,
          },
          {
            spec: '2.2.0',
            source: 'dependency',
            from: 'pkg-a',
            optional: false,
          },
        ],
      ],
    ]);

    const resolved = resolveVersionConflicts(specs, logger);
    expect(resolved.get('@walkeros/core')!.version).toBe('2.1.1');
  });

  it('should keep local path packages', () => {
    const specs = new Map<string, VersionSpec[]>([
      [
        'my-local',
        [
          {
            spec: 'local',
            source: 'direct',
            from: 'flow.json',
            optional: false,
            localPath: './pkg',
          },
        ],
      ],
    ]);

    const resolved = resolveVersionConflicts(specs, logger);
    expect(resolved.get('my-local')!.localPath).toBe('./pkg');
  });
});
