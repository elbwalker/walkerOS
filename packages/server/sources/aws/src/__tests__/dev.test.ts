import { readFileSync } from 'fs';
import { join } from 'path';
import { examples, exportExamples } from '../dev';

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

  it('keeps examples as the sourceLambda entry', () => {
    expect(exportExamples.sourceLambda).toBe(examples);
  });

  it.each(Object.entries(exportExamples))(
    '%s ships a createTrigger',
    (_name, examples) => {
      expect(typeof examples.createTrigger).toBe('function');
    },
  );
});
