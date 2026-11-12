/**
 * A local package whose `main` sits outside `dist/` (as `qs` ships: `lib/`
 * for Node, `dist/` for browsers) arrives with its entry, so a server flow
 * that loads it starts and delivers.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { Flow } from '@walkeros/core';
import { runPushCommand } from '../run.js';
import { withLocalPackages } from '../../../__tests__/helpers/local-packages.js';

describe('a local package with its main in lib/ and a browser build in dist/', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-pkg-lib-'));
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it('arrives with lib/, and the flow starts and delivers', async () => {
    const pkgDir = path.join(tmpDir, 'fake-dest');
    const delivered = path.join(tmpDir, 'delivered.txt');
    await fs.outputJson(path.join(pkgDir, 'package.json'), {
      name: 'fake-dest',
      version: '1.0.0',
      main: 'lib/index.js',
      browser: 'dist/fake-dest.js',
    });
    await fs.outputFile(
      path.join(pkgDir, 'lib', 'index.js'),
      `const fs = require('fs');
module.exports = {
  type: 'fake',
  config: {},
  push(event) {
    fs.appendFileSync(${JSON.stringify(delivered)}, event.name + '\\n');
  },
};
`,
    );
    await fs.outputFile(
      path.join(pkgDir, 'dist', 'fake-dest.js'),
      'window.fakeDest = {};',
    );

    const config: Flow.Json = withLocalPackages({
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'server',
            bundle: { packages: { 'fake-dest': { path: pkgDir } } },
          },
          destinations: { fake: { package: 'fake-dest' } },
        },
      },
    });
    const configPath = path.join(tmpDir, 'flow.json');
    await fs.writeJSON(configPath, config);

    const result = await runPushCommand({
      config: configPath,
      event: JSON.stringify({ name: 'page view', data: { title: 'Home' } }),
      silent: true,
    });

    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(await fs.readFile(delivered, 'utf8')).toBe('page view\n');
  }, 120000);
});
