import { readFileSync } from 'fs';
import { join } from 'path';
import {
  examples,
  exportExamples,
  exportSchemas,
  hints,
  schemas,
} from '../dev';
import { DEFAULT_SETUP as PUBSUB_DEFAULT_SETUP } from '../pubsub/setup';

interface PackageJson {
  walkerOS: { exports: Record<string, string> };
}

const pkg: PackageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf8'),
);

describe('exportExamples', () => {
  it('lists every export in package.json, the default included', () => {
    expect(Object.keys(exportExamples).sort()).toEqual(
      Object.keys(pkg.walkerOS.exports).sort(),
    );
  });

  it('keeps the BigQuery examples as the default export entry', () => {
    expect(exportExamples.destinationBigQuery).toBe(examples);
  });

  it.each(Object.entries(exportExamples))(
    '%s ships a mock env',
    (_name, examples) => {
      expect(examples.env).toBeDefined();
    },
  );
});

describe('exportSchemas', () => {
  it('lists every export in package.json, the default included', () => {
    expect(Object.keys(exportSchemas).sort()).toEqual(
      Object.keys(pkg.walkerOS.exports).sort(),
    );
  });

  it('keeps the BigQuery schemas as the default export entry', () => {
    expect(exportSchemas.destinationBigQuery).toEqual({
      settings: schemas.settings,
      mapping: schemas.mapping,
    });
    expect(exportSchemas.destinationBigQuery.settings).toBe(schemas.settings);
  });

  it('ships the Pub/Sub schemas for destinationPubSub', () => {
    expect(exportSchemas.destinationPubSub).toEqual({
      settings: schemas.pubsubSettings,
      mapping: schemas.pubsubMapping,
      setup: schemas.pubsubSetup,
    });
    expect(exportSchemas.destinationPubSub.settings).toBe(
      schemas.pubsubSettings,
    );
  });
});

/** The value at a path of a JSON schema, or undefined when a step is missing. */
function at(schema: unknown, path: string[]): unknown {
  let node: unknown = schema;
  for (const key of path) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = Reflect.get(node, key);
  }
  return node;
}

describe('published metadata matches the code', () => {
  it('names the Pub/Sub default storage regions that setup writes', () => {
    const description = at(schemas.pubsubSetup, [
      'properties',
      'messageStoragePolicy',
      'properties',
      'allowedPersistenceRegions',
      'description',
    ]);
    for (const region of PUBSUB_DEFAULT_SETUP.messageStoragePolicy
      .allowedPersistenceRegions)
      expect(description).toContain(region);
  });

  it('says where the BigQuery dataset location is set', () => {
    expect(
      at(schemas.settings, ['properties', 'location', 'description']),
    ).toContain('config.setup.location');
  });

  it('says the BigQuery client is used by setup only', () => {
    expect(
      at(schemas.settings, ['properties', 'client', 'description']),
    ).toContain('walkeros setup');
  });

  it('names the default dataset and the setup command in the hints', () => {
    const dataset = at(schemas.settings, [
      'properties',
      'datasetId',
      'default',
    ]);
    expect(typeof dataset).toBe('string');
    expect(hints['storage-format'].text).toContain(`"${dataset}"`);
    expect(hints['troubleshoot-empty-table'].text).toContain('walkeros setup');
    expect(hints['auth-methods'].text).toContain('config.credentials');
  });

  it('scopes the auth hint to BigQuery and names the failure counter', () => {
    expect(hints['auth-methods'].text).toMatch(/^BigQuery /);
    expect(hints['troubleshoot-empty-table'].text).toContain(
      'status.destinations.<id>.failed',
    );
  });

  it('writes the hints without dashes', () => {
    for (const hint of Object.values(hints))
      expect(hint.text).not.toMatch(/[\u2013\u2014]/);
  });

  it.each(Object.entries(exportExamples))(
    '%s step examples carry millisecond timestamps',
    (_name, examples) => {
      for (const example of Object.values(examples.step)) {
        const timestamp = at(example, ['in', 'timestamp']);
        if (typeof timestamp === 'number')
          expect(timestamp).toBeGreaterThan(1e12);
      }
    },
  );
});
