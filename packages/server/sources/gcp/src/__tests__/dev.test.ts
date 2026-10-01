import { readFileSync } from 'fs';
import { join } from 'path';
import {
  examples,
  exportExamples,
  exportSchemas,
  pubsubPullSchemas,
  pubsubPushSchemas,
  schemas,
} from '../dev';

interface PackageJson {
  walkerOS: { exports: Record<string, string> };
}

const pkg: PackageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf8'),
);

describe('exportExamples', () => {
  it('lists every export in package.json', () => {
    expect(Object.keys(exportExamples).sort()).toEqual(
      Object.keys(pkg.walkerOS.exports).sort(),
    );
  });

  it('keeps examples as the sourceCloudFunction entry', () => {
    expect(exportExamples.sourceCloudFunction).toBe(examples);
  });

  it.each(Object.entries(exportExamples))(
    '%s ships a createTrigger',
    (_name, examples) => {
      expect(typeof examples.createTrigger).toBe('function');
    },
  );
});

describe('exportSchemas', () => {
  it('lists every export in package.json', () => {
    expect(Object.keys(exportSchemas).sort()).toEqual(
      Object.keys(pkg.walkerOS.exports).sort(),
    );
  });

  it('keeps the Cloud Function schema as the sourceCloudFunction entry', () => {
    expect(exportSchemas.sourceCloudFunction).toEqual({
      settings: schemas.settings,
    });
    expect(exportSchemas.sourceCloudFunction.settings).toBe(schemas.settings);
  });

  it('ships the Pub/Sub pull schemas for sourcePubSubPull', () => {
    expect(exportSchemas.sourcePubSubPull).toEqual({
      settings: pubsubPullSchemas.settings,
      setup: pubsubPullSchemas.setup,
    });
    expect(exportSchemas.sourcePubSubPull.settings).toBe(
      pubsubPullSchemas.settings,
    );
  });

  it('ships the Pub/Sub push schema for sourcePubSubPush', () => {
    expect(exportSchemas.sourcePubSubPush).toEqual({
      settings: pubsubPushSchemas.settings,
    });
    expect(exportSchemas.sourcePubSubPush.settings).toBe(
      pubsubPushSchemas.settings,
    );
  });
});
