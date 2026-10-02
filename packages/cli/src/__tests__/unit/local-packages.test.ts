import fs from 'fs';
import path from 'path';
import type { Flow } from '@walkeros/core';
import {
  injectLocalPaths,
  localPackageDir,
  packagesDir,
} from '../helpers/local-packages.js';

describe('local monorepo packages', () => {
  it('resolves a package cli depends on, directly or through a dependency', () => {
    expect(localPackageDir('@walkeros/web-source-browser')).toBe(
      path.join(packagesDir, 'web/sources/browser'),
    );
    expect(localPackageDir('@walkeros/web-core')).toBe(
      path.join(packagesDir, 'web/core'),
    );
  });

  it('rejects a package outside cli dependencies, naming it', () => {
    // mcp depends on cli, so it can never be one of cli's dependencies.
    expect(() => localPackageDir('@walkeros/mcp')).toThrow(
      '@walkeros/mcp is bundled from the monorepo but is not in the packages/cli dependency closure',
    );
  });

  it('points a flow package and its dependencies at the monorepo', () => {
    const flow: Flow = {
      config: {
        platform: 'web',
        bundle: {
          packages: { '@walkeros/web-destination-gtag': { version: '1.0.0' } },
        },
      },
    };
    injectLocalPaths(flow);
    const packages = flow.config?.bundle?.packages ?? {};
    expect(packages['@walkeros/web-destination-gtag']).toEqual({
      version: '1.0.0',
      path: path.join(packagesDir, 'web/destinations/gtag'),
    });
    expect(packages['@walkeros/web-core']?.path).toBe(
      path.join(packagesDir, 'web/core'),
    );
  });

  it('is the only way cli tests reach a directory outside packages/cli', () => {
    const cliDir = path.join(packagesDir, 'cli');
    const helper = path.join(cliDir, 'src/__tests__/helpers/local-packages.ts');
    const testFiles = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) return testFiles(file);
        const isTest =
          file.includes(`${path.sep}__tests__${path.sep}`) ||
          /\.test\.tsx?$/.test(entry.name);
        return isTest && /\.tsx?$/.test(entry.name) ? [file] : [];
      });
    // resolve(__dirname, '...', ...) and join(__dirname, ...) with literal segments.
    const call =
      /\b(?:resolve|join)\(\s*__dirname\s*((?:,\s*(?:'[^'\n]*'|"[^"\n]*")\s*)*)/g;
    const escapes: string[] = [];
    for (const file of testFiles(path.join(cliDir, 'src'))) {
      if (file === helper) continue;
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(call)) {
        const segments = [
          ...(match[1] ?? '').matchAll(/'([^'\n]*)'|"([^"\n]*)"/g),
        ].map((segment) => segment[1] ?? segment[2] ?? '');
        const target = path.resolve(path.dirname(file), ...segments);
        if (!path.relative(cliDir, target).startsWith('..')) continue;
        const line = source.slice(0, match.index).split('\n').length;
        escapes.push(`${path.relative(cliDir, file)}:${line}`);
      }
    }
    expect(escapes).toEqual([]);
  });
});
