import { readFileSync } from 'fs';
import { join } from 'path';
import {
  examples,
  exportExamples,
  exportSchemas,
  hints,
  schemas,
} from '../dev';

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

describe('published examples', () => {
  it.each(Object.entries(exportExamples))(
    '%s step examples carry millisecond timestamps',
    (_name, examples) => {
      for (const example of Object.values(examples.step)) {
        const input: unknown = example.in;
        const timestamp =
          typeof input === 'object' && input !== null
            ? Reflect.get(input, 'timestamp')
            : undefined;
        if (typeof timestamp === 'number')
          expect(timestamp).toBeGreaterThan(1e12);
      }
    },
  );
});

describe('hints', () => {
  it('describe today without promising later behaviour', () => {
    for (const hint of Object.values(hints))
      expect(hint.text).not.toMatch(/\byet\b/);
  });
});
