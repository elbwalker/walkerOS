import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildDev } from '../index.mjs';

describe('buildDev walkerOS.json generation', () => {
  const name = '@walkeros/fixture-dev';
  let dir;

  const inPackage = ({ pkg = { name, version: '1.0.0' }, dev } = {}) => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-builddev-'));
    if (pkg) writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg));
    if (dev !== undefined) {
      mkdirSync(join(dir, 'dist'));
      writeFileSync(join(dir, 'dist', 'dev.mjs'), dev);
    }
    jest.spyOn(process, 'cwd').mockReturnValue(dir);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    return buildDev().onSuccess();
  };

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes dist/walkerOS.json with functions as $code', async () => {
    await inPackage({
      dev: [
        "export const schemas = { settings: { type: 'object' } };",
        'export const examples = { step: { a: { mapping: { fn: (v) => v } } } };',
      ].join('\n'),
    });
    const json = JSON.parse(
      readFileSync(join(dir, 'dist', 'walkerOS.json'), 'utf8'),
    );
    expect(json.$meta).toEqual({ package: name, version: '1.0.0' });
    expect(json.examples.step.a.mapping.fn.$code).toMatch(/^\(v\)\s*=>\s*v$/);
  });

  it('fails when package.json cannot be read', async () => {
    await expect(inPackage({ pkg: null, dev: '' })).rejects.toThrow(
      /package\.json/,
    );
  });

  it('fails naming the package when dist/dev.mjs is missing', async () => {
    await expect(inPackage()).rejects.toThrow(
      `${name}: dist/dev.mjs not found`,
    );
  });

  it('fails naming the package when dist/dev.mjs throws on import', async () => {
    await expect(
      inPackage({ dev: "throw new Error('dev entry is broken');" }),
    ).rejects.toThrow(
      `${name}: dist/dev.mjs does not import: dev entry is broken`,
    );
  });

  it('fails naming the package when it exports no schemas', async () => {
    await expect(
      inPackage({
        dev: 'export const schemas = {}; export const examples = {};',
      }),
    ).rejects.toThrow(`${name}: dist/dev.mjs exports no schemas`);
    expect(existsSync(join(dir, 'dist', 'walkerOS.json'))).toBe(false);
  });

  it('fails naming the package when the output is not valid JSON', async () => {
    await expect(
      inPackage({
        dev: [
          "export const schemas = { settings: { type: 'object' } };",
          'export const examples = { step: { a: { in: 1n } } };',
        ].join('\n'),
      }),
    ).rejects.toThrow(`${name}: walkerOS.json is not valid JSON`);
    expect(existsSync(join(dir, 'dist', 'walkerOS.json'))).toBe(false);
  });
});
