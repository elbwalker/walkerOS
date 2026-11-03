import { STEP_TYPES } from '@walkeros/core/dev';
import { assertExportMaps, assertStepSettings } from '../exportMaps.mjs';

const two = { destinationA: 'A', destinationB: 'B' };
const examples = { destinationA: {}, destinationB: {} };
const schemas = {
  destinationA: { settings: {} },
  destinationB: { settings: {}, setup: {} },
};

describe('assertExportMaps', () => {
  it.each([
    ['no declared exports and no maps', undefined, {}],
    ['a single export and no maps', { destinationA: 'A' }, {}],
    [
      'two exports with matching maps',
      two,
      { exportExamples: examples, exportSchemas: schemas },
    ],
  ])('passes for %s', (_label, declared, maps) => {
    expect(() => assertExportMaps('@walkeros/x', declared, maps)).not.toThrow();
  });

  it.each([
    [
      'exportSchemas missing',
      two,
      { exportExamples: examples },
      '@walkeros/x: exportSchemas is missing',
    ],
    [
      'exportExamples missing',
      two,
      { exportSchemas: schemas },
      '@walkeros/x: exportExamples is missing',
    ],
    [
      'an export missing from exportSchemas',
      two,
      {
        exportExamples: examples,
        exportSchemas: { destinationA: { settings: {} } },
      },
      '@walkeros/x: exportSchemas is missing export "destinationB"',
    ],
    [
      'an undeclared export in exportSchemas',
      two,
      {
        exportExamples: examples,
        exportSchemas: { ...schemas, destinationC: { settings: {} } },
      },
      '@walkeros/x: exportSchemas has undeclared export "destinationC"',
    ],
    [
      'an exportSchemas entry without settings',
      two,
      {
        exportExamples: examples,
        exportSchemas: { ...schemas, destinationB: { setup: {} } },
      },
      '@walkeros/x: exportSchemas.destinationB has no settings schema',
    ],
    [
      'an export missing from exportExamples',
      two,
      { exportExamples: { destinationA: {} }, exportSchemas: schemas },
      '@walkeros/x: exportExamples is missing export "destinationB"',
    ],
    [
      'maps on a single-export package',
      { destinationA: 'A' },
      { exportSchemas: { destinationA: { settings: {} } } },
      '@walkeros/x: exportSchemas is set but the package declares fewer than two exports',
    ],
  ])('throws for %s', (_label, declared, maps, message) => {
    expect(() => assertExportMaps('@walkeros/x', declared, maps)).toThrow(
      new Error(message),
    );
  });
});

describe('assertStepSettings', () => {
  it.each([...STEP_TYPES])(
    'throws for a %s package without schemas.settings',
    (type) => {
      expect(() =>
        assertStepSettings('@walkeros/x', type, {}, STEP_TYPES),
      ).toThrow(new Error('@walkeros/x: schemas.settings is missing'));
    },
  );

  it.each([
    ['a destination with settings', 'destination', { settings: {} }],
    ['a package without a type', undefined, {}],
    ['a non-step package', 'core', {}],
  ])('passes for %s', (_label, type, published) => {
    expect(() =>
      assertStepSettings('@walkeros/x', type, published, STEP_TYPES),
    ).not.toThrow();
  });
});
