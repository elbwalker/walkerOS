import type { Flow } from '../types';
import { isObject } from '../is';
import { z } from '../schemas';
import { validateFlowConfig } from '../schemas/validate-flow-config';
import { composeQuickstart } from '../quickstart';

/** The settings of the flow's one destination. */
function flowSettings(flow: Flow.Json, key: string): unknown {
  const config = flow.flows.default?.destinations?.[key]?.config;
  return isObject(config) ? config.settings : undefined;
}

describe('composeQuickstart', () => {
  const web: Flow.PackageMeta = {
    package: '@walkeros/web-destination-x',
    version: '1.0.0',
    platform: ['web'],
    type: 'destination',
  };
  const webSettings = z.object({ id: z.string() }).strict();
  const server: Flow.PackageMeta = {
    package: '@walkeros/server-destination-y',
    version: '1.0.0',
    platform: ['server'],
    type: 'destination',
  };

  it('composes the install line, the integrated code and the flow of a web destination', () => {
    const quickstart = composeQuickstart(web, { settings: { id: 'G-XXXX' } });

    expect(quickstart.install).toBe(
      'npm install @walkeros/collector @walkeros/web-destination-x',
    );
    expect(quickstart.integrated)
      .toBe(`import { startFlow } from '@walkeros/collector';
import destinationX from '@walkeros/web-destination-x';

await startFlow({
  destinations: {
    x: {
      code: destinationX,
      config: {
        settings: {
          id: 'G-XXXX',
        },
      },
    },
  },
});
`);
    expect(quickstart.flow).toEqual({
      version: 4,
      flows: {
        default: {
          config: { platform: 'web' },
          destinations: {
            x: {
              package: '@walkeros/web-destination-x',
              config: { settings: { id: 'G-XXXX' } },
            },
          },
        },
      },
    });
    expect(validateFlowConfig(JSON.stringify(quickstart.flow))).toMatchObject({
      valid: true,
      errors: [],
    });
    expect(
      webSettings.safeParse(flowSettings(quickstart.flow, 'x')).success,
    ).toBe(true);
    expect(quickstart.run.settings).toEqual({ id: 'G-XXXX' });
  });

  it('reads every secret as a secret and never shows its placeholder', () => {
    const placeholder = 's3cr3t-placeholder';
    const quickstart = composeQuickstart(server, {
      settings: { accessToken: placeholder, pixelId: '1234567890' },
      secrets: { accessToken: 'X_TOKEN' },
    });
    const flow = JSON.stringify(quickstart.flow, null, 2);

    expect(quickstart.integrated).toContain(
      'accessToken: process.env.X_TOKEN,',
    );
    expect(flow).toContain('"accessToken": "$secret.X_TOKEN"');
    expect(quickstart.integrated).not.toContain(placeholder);
    expect(flow).not.toContain(placeholder);
    expect(validateFlowConfig(flow)).toMatchObject({ valid: true, errors: [] });
    expect(
      z
        .object({ accessToken: z.string(), pixelId: z.string() })
        .strict()
        .safeParse(flowSettings(quickstart.flow, 'y')).success,
    ).toBe(true);
    expect(quickstart.run.settings).toEqual({
      accessToken: placeholder,
      pixelId: '1234567890',
    });
  });

  it('imports the named export of a package with several exports', () => {
    const quickstart = composeQuickstart(
      {
        package: '@walkeros/server-destination-z',
        version: '1.0.0',
        platform: ['server'],
        type: 'destination',
        exports: { destinationOne: 'One', destinationTwo: 'Two' },
      },
      { settings: { topic: 'events' } },
      'destinationTwo',
    );

    expect(quickstart.integrated).toContain(
      "import { destinationTwo } from '@walkeros/server-destination-z';",
    );
    expect(quickstart.flow.flows.default?.destinations).toEqual({
      two: {
        package: '@walkeros/server-destination-z',
        import: 'destinationTwo',
        config: { settings: { topic: 'events' } },
      },
    });
  });

  it('sets loadScript next to the settings of a destination that loads its vendor script', () => {
    const quickstart = composeQuickstart(web, {
      settings: { id: 'G-XXXX' },
      config: { loadScript: true },
    });

    expect(quickstart.integrated).toContain(`      config: {
        loadScript: true,
        settings: {
          id: 'G-XXXX',
        },
      },`);
    expect(quickstart.flow.flows.default?.destinations?.x?.config).toEqual({
      loadScript: true,
      settings: { id: 'G-XXXX' },
    });
    expect(quickstart.run).toEqual({
      settings: { id: 'G-XXXX' },
      config: { loadScript: true },
    });
  });

  it('indents nested settings one level deeper at every depth', () => {
    const quickstart = composeQuickstart(server, {
      settings: {
        kafka: { brokers: ['localhost:9092'], topic: 'walkeros-events' },
        headers: [{ name: 'x-source', value: 'walkeros' }],
      },
    });

    expect(quickstart.integrated)
      .toBe(`import { startFlow } from '@walkeros/collector';
import destinationY from '@walkeros/server-destination-y';

await startFlow({
  destinations: {
    y: {
      code: destinationY,
      config: {
        settings: {
          kafka: {
            brokers: [
              'localhost:9092',
            ],
            topic: 'walkeros-events',
          },
          headers: [
            {
              name: 'x-source',
              value: 'walkeros',
            },
          ],
        },
      },
    },
  },
});
`);
  });

  // A page passes walkerOS.json data unchecked, so a broken minimal example
  // reaches the composer as parsed JSON.
  const parsed = (json: string): Flow.MinimalExample => JSON.parse(json);

  it.each<[string, Flow.PackageMeta, Flow.MinimalExample, string]>([
    [
      'a minimal example without settings',
      web,
      parsed('{}'),
      'minimal example of @walkeros/web-destination-x has no settings',
    ],
    [
      'no minimal example',
      web,
      parsed('null'),
      '@walkeros/web-destination-x has no minimal example',
    ],
    [
      'a secret on a web destination',
      web,
      { settings: { token: 'x' }, secrets: { token: 'X_TOKEN' } },
      'minimal example of @walkeros/web-destination-x: a web flow holds no secret (secrets resolve on server flows only)',
    ],
    [
      'a secret without a placeholder',
      server,
      { settings: {}, secrets: { token: 'X_TOKEN' } },
      'minimal example of @walkeros/server-destination-y: the secret token has no placeholder in settings',
    ],
    [
      'a secret that names no secret',
      server,
      { settings: { token: 'x' }, secrets: { token: 'x_token' } },
      'minimal example of @walkeros/server-destination-y: the secret token names x_token, which is not a secret name (A-Z, 0-9 and _)',
    ],
    [
      'a setting that is not JSON',
      web,
      { settings: { id: () => 'G-XXXX' } },
      'minimal example of @walkeros/web-destination-x: settings.id is not JSON',
    ],
    [
      'a config key other than loadScript',
      web,
      parsed('{"settings":{},"config":{"consent":{"marketing":true}}}'),
      'minimal example of @walkeros/web-destination-x: config sets consent, but a minimal example sets only loadScript',
    ],
    [
      'a package that is not a destination',
      { ...web, type: 'source' },
      { settings: {} },
      '@walkeros/web-destination-x is a source: a quickstart is composed for destinations only',
    ],
    [
      'a package without exactly one platform',
      { ...web, platform: ['web', 'server'] },
      { settings: {} },
      '@walkeros/web-destination-x declares the platforms web, server: a quickstart needs exactly one',
    ],
    [
      'several exports without the export to compose',
      { ...web, exports: { a: 'A', b: 'B' } },
      { settings: {} },
      '@walkeros/web-destination-x has several exports (a, b): name the export the minimal example belongs to',
    ],
  ])('throws for %s', (_, meta, minimal, message) => {
    expect(() => composeQuickstart(meta, minimal)).toThrow(message);
  });

  it('throws for metadata that names no package', () => {
    const meta: Flow.PackageMeta = JSON.parse('{}');
    expect(() => composeQuickstart(meta, { settings: {} })).toThrow(
      'the package metadata names no package',
    );
  });
});
