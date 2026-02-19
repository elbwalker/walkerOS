import fs from 'fs';
import path from 'path';

describe('runtime/main.ts imports', () => {
  let source: string;

  beforeAll(async () => {
    source = await fs.promises.readFile(
      path.resolve(__dirname, '../runtime/main.ts'),
      'utf-8',
    );
  });

  it('does not statically import isPreBuiltConfig from commands/run/utils', () => {
    expect(source).not.toMatch(
      /import\s+\{[^}]*isPreBuiltConfig[^}]*\}\s+from\s+['"]\.\.\/commands\/run\/utils/,
    );
  });

  it('does not statically import prepareBundleForRun', () => {
    expect(source).not.toMatch(/^import\s+\{[^}]*prepareBundleForRun/m);
    // Verify dynamic import is used instead
    expect(source).toMatch(/await import\(['"]\.\.\/commands\/run\/utils/);
  });
});
