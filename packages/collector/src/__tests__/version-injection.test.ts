import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('version injection', () => {
  it('embeds the current package.json version in the built dist', () => {
    const distPath = resolve(__dirname, '../../dist/index.js');
    if (!existsSync(distPath)) {
      // Build has not run; skip rather than false-fail in watch mode.
      return;
    }
    const pkg = JSON.parse(
      readFileSync(resolve(__dirname, '../../package.json'), 'utf8'),
    );
    const dist = readFileSync(distPath, 'utf8');
    expect(dist).toContain(`"${pkg.version}"`);
  });
});
