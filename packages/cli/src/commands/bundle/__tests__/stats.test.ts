import type { Logger } from '@walkeros/core';
import type { BundleStats } from '../bundler.js';
import { createStatsSummary, displayStats } from '../stats.js';

// A multi-package flow. The old bundler emitted a stubbed per-package `size`
// (uniform `floor(totalSize / count)` for imported packages, `0` for core),
// which the summary then forwarded verbatim. Stats now report only real fields,
// no per-package byte size.
const multiPackageStats: BundleStats = {
  totalSize: 950,
  packages: [
    { name: '@walkeros/core@latest' },
    { name: '@walkeros/collector@latest' },
    { name: '@walkeros/web-source-browser@latest' },
    { name: '@walkeros/web-destination-gtag@latest' },
  ],
  buildTime: 42,
  treeshakingEffective: true,
};

describe('bundle stats summary', () => {
  it('keeps real fields and omits per-package size', () => {
    const summary = createStatsSummary(multiPackageStats);

    expect(summary.totalSize).toBe(950);
    expect(summary.packageCount).toBe(4);
    expect(summary.packages.map((p) => p.name)).toEqual([
      '@walkeros/core@latest',
      '@walkeros/collector@latest',
      '@walkeros/web-source-browser@latest',
      '@walkeros/web-destination-gtag@latest',
    ]);

    // No per-package byte size of any kind survives into the summary.
    for (const pkg of summary.packages) {
      expect(pkg).not.toHaveProperty('size');
      expect(pkg).not.toHaveProperty('sizeFormatted');
    }
  });

  it('does not emit a uniform stubbed size or a hard-zero for core', () => {
    const summary = createStatsSummary(multiPackageStats);
    const serialized = JSON.stringify(summary.packages);

    // The old stub produced 237 (= floor(950/4)) for imported packages and 0
    // for core. Neither sentinel should appear as a size value.
    expect(serialized).not.toContain('"size"');
    expect(serialized).not.toContain('237');
  });
});

describe('bundle stats display', () => {
  it('lists package names without a per-package KB figure', () => {
    const lines: string[] = [];
    const logger: Logger.Instance = {
      debug: jest.fn(),
      info: jest.fn((msg: string | Error) => {
        lines.push(msg instanceof Error ? msg.message : msg);
      }),
      warn: jest.fn(),
      error: jest.fn(),
      throw: jest.fn((msg: string | Error): never => {
        throw msg instanceof Error ? msg : new Error(msg);
      }),
      json: jest.fn(),
      scope: jest.fn((): Logger.Instance => logger),
    };

    displayStats(multiPackageStats, logger);

    const output = lines.join('\n');
    expect(output).toContain('@walkeros/core@latest');
    // No "<pkg>: <n> KB" per-package size line.
    expect(output).not.toMatch(/@walkeros\/core@latest:\s*[\d.]+\s*KB/);
  });
});
