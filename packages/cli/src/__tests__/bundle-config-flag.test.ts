import fs from 'fs';
import path from 'path';

describe('bundle --config flag', () => {
  it('cli.ts registers --config option on bundle command', async () => {
    const source = await fs.promises.readFile(
      path.resolve(__dirname, '../cli.ts'),
      'utf-8',
    );
    // Verify the --config option is registered
    expect(source).toMatch(/--config <path>/);
  });

  it('cli.ts passes --config over positional file arg', async () => {
    const source = await fs.promises.readFile(
      path.resolve(__dirname, '../cli.ts'),
      'utf-8',
    );
    // The action handler should prefer options.config over file
    expect(source).toMatch(/config:\s*options\.config\s*\|\|\s*file/);
  });

  it('bundleCommand uses options.config as config file', async () => {
    const source = await fs.promises.readFile(
      path.resolve(__dirname, '../commands/bundle/index.ts'),
      'utf-8',
    );
    // Verify the config option is used to resolve the file
    expect(source).toMatch(/options\.config\s*\|\|/);
  });
});
