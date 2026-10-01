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

  it('keeps the Firehose examples as the default export entry', () => {
    expect(exportExamples.destinationFirehose).toBe(examples.firehose);
    expect(examples.env).toBe(examples.firehose.env);
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

  it('keeps the Firehose schemas as the default export entry', () => {
    expect(exportSchemas.destinationFirehose).toEqual({
      settings: schemas.settings,
      mapping: schemas.mapping,
    });
    expect(exportSchemas.destinationFirehose.settings).toBe(schemas.settings);
  });

  it('ships the SNS schemas for destinationSNS', () => {
    expect(exportSchemas.destinationSNS).toEqual({
      settings: schemas.snsSettings,
      mapping: schemas.snsMapping,
      setup: schemas.snsSetup,
    });
    expect(exportSchemas.destinationSNS.settings).toBe(schemas.snsSettings);
  });
});
