import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { wrapSkeleton } from '../../../commands/bundle/wrap.js';

/**
 * wrapSkeleton consumes a Stage 1 skeleton ESM file that exports
 * `wireConfig`, `startFlow`, and `__configData`, and produces either a
 * browser IIFE or a node factory module.
 */
describe('wrapSkeleton', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrap-skeleton-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir).catch(() => {});
  });

  async function writeFakeSkeleton(filename = 'skeleton.mjs'): Promise<string> {
    const skeletonPath = path.join(tmpDir, filename);
    const contents = `
export function wireConfig(d) { return d; }
export function startFlow(c) {
  return Promise.resolve({
    collector: { config: c, sources: {} },
    elb: function elb() { return { ok: true }; }
  });
}
export const __configData = { test: true };
`;
    await fs.writeFile(skeletonPath, contents);
    return skeletonPath;
  }

  it('wraps a browser skeleton into a self-executing IIFE', async () => {
    const skeletonPath = await writeFakeSkeleton();
    const outputPath = path.join(tmpDir, 'walker.js');

    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath,
      windowCollector: 'walker',
      windowElb: 'elb',
      minify: false,
    });

    const output = await fs.readFile(outputPath, 'utf-8');

    // Self-executing IIFE wrapper
    expect(output).toContain('(async () =>');
    // Bootstrap call
    expect(output).toMatch(/startFlow\s*\(\s*wireConfig\s*\(/);
    // Window assignments (esbuild may normalize quote style, so match both)
    expect(output).toMatch(/window\[['"]walker['"]\]/);
    expect(output).toMatch(/window\[['"]elb['"]\]/);
    // No top-level ESM exports — everything is wrapped
    expect(output).not.toMatch(/^export\s/m);
    // __configData was pulled from the skeleton (not inlined by caller)
    expect(output).toContain('test');
  });

  it('omits window assignments when collector/elb names are not provided', async () => {
    const skeletonPath = await writeFakeSkeleton();
    const outputPath = path.join(tmpDir, 'walker.js');

    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath,
      minify: false,
    });

    const output = await fs.readFile(outputPath, 'utf-8');
    // Default window names ('collector' and 'elb') are NOT assumed — the
    // wrap step should only emit assignments for explicitly named windows.
    // (Matches the behavior of generateWebEntry.)
    expect(output).not.toMatch(/window\[['"]collector['"]\]/);
  });

  it('wraps a node skeleton into a default-export factory module', async () => {
    const skeletonPath = await writeFakeSkeleton();
    const outputPath = path.join(tmpDir, 'bundle.mjs');

    await wrapSkeleton({
      skeletonPath,
      platform: 'node',
      outputPath,
      minify: false,
    });

    const output = await fs.readFile(outputPath, 'utf-8');

    // Default export factory
    expect(output).toMatch(/export\s*{[^}]*as default/);
    // Bootstrap imports __configData from skeleton
    expect(output).toContain('wireConfig');
    expect(output).toContain('startFlow');
    // Server-path should contain the context handling boilerplate
    expect(output).toContain('sourceSettings');
    expect(output).toContain('httpHandler');
  });

  it('throws when the skeleton does not exist', async () => {
    const outputPath = path.join(tmpDir, 'walker.js');
    await expect(
      wrapSkeleton({
        skeletonPath: path.join(tmpDir, 'does-not-exist.mjs'),
        platform: 'browser',
        outputPath,
      }),
    ).rejects.toThrow(/skeleton not found/i);
  });
});
