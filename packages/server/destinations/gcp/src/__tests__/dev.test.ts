import { readFileSync } from 'fs';
import { join } from 'path';
import { examples, exportExamples, exportSchemas, schemas } from '../dev';

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
