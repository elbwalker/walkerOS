/**
 * Integration Test: a server flow that serves a web flow
 *
 * Builds the fixture's server flow, which lists the web flow `casamoda` in
 * `config.bundle.flows`, into a folder and into an archive. Uses real
 * packages from the registry, real bundles, NO MOCKING.
 */

import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { t as tarList } from 'tar';
import { bundle } from '../../../commands/bundle/index.js';

const configPath = path.resolve(
  __dirname,
  '../../fixtures/served-flows/flow.json',
);

/** esbuild's IIFE opener: `(()=>{`, `(async()=>{` or `var x=(()=>{`. */
const IIFE_OPENER = /^(var\s+\w+\s*=\s*)?\(\s*(async\s*)?\(\s*\)\s*=>/;

describe('a server flow that serves a web flow (real build)', () => {
  let workDir: string;

  beforeAll(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walkeros-served-it-'));
  });

  afterAll(async () => {
    await fs.remove(workDir);
  });

  it('writes the server bundle and the web flow as an IIFE into a folder', async () => {
    const dist = path.join(workDir, 'dist');

    await bundle(configPath, {
      flowName: 'server',
      silent: true,
      buildOverrides: { output: path.join(dist, 'flow.mjs') },
    });

    expect(await fs.pathExists(path.join(dist, 'flow.mjs'))).toBe(true);
    const walker = await fs.readFile(
      path.join(dist, 'casamoda', 'walker.js'),
      'utf8',
    );
    expect(walker.trimStart()).toMatch(IIFE_OPENER);
    expect(walker).toContain('servedProbe');
  }, 300000);

  it('packs the web flow beside flow.mjs in an archive', async () => {
    const archive = path.join(workDir, 'server.tar.gz');

    await bundle(configPath, {
      flowName: 'server',
      silent: true,
      buildOverrides: { output: archive },
    });

    const entries: string[] = [];
    await tarList({
      file: archive,
      onReadEntry: (entry) => {
        entries.push(entry.path);
      },
    });
    expect(entries).toEqual(
      expect.arrayContaining(['flow.mjs', 'casamoda/walker.js']),
    );
  }, 300000);
});
