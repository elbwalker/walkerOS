import { builtinModules } from 'module';

describe('node builtins external list', () => {
  it('builtinModules includes all expected modules', () => {
    const expected = [
      'crypto',
      'fs',
      'path',
      'os',
      'http',
      'https',
      'net',
      'tls',
      'child_process',
      'worker_threads',
      'stream',
      'events',
      'buffer',
      'url',
      'querystring',
      'zlib',
      'util',
      'string_decoder',
      'diagnostics_channel',
      'async_hooks',
      'perf_hooks',
    ];
    for (const mod of expected) {
      expect(builtinModules).toContain(mod);
    }
  });

  it('generates both bare and node: prefixed externals', () => {
    const { getNodeExternals } = require('../bundler');
    const externals = getNodeExternals();

    // Must include bare names
    expect(externals).toContain('fs');
    expect(externals).toContain('http');
    expect(externals).toContain('crypto');

    // Must include node: prefixed
    expect(externals).toContain('node:fs');
    expect(externals).toContain('node:http');
    expect(externals).toContain('node:crypto');

    // Must include subpath patterns
    expect(externals).toContain('fs/*');
    expect(externals).toContain('node:fs/*');

    // Must NOT include express, cors, or any npm packages
    expect(externals).not.toContain('express');
    expect(externals).not.toContain('cors');
    expect(externals).not.toContain('express/*');
    expect(externals).not.toContain('cors/*');

    // Must NOT include internal modules (prefixed with _)
    for (const ext of externals) {
      expect(ext).not.toMatch(/^_/);
      expect(ext).not.toMatch(/^node:_/);
    }
  });
});
