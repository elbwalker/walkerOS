import * as fs from 'fs';
import * as path from 'path';

/**
 * Coverage regression: every walker command declared in the public elb
 * interface (BrowserPush + Elb.WalkerCommands) must have at least one
 * occurrence of the literal "walker <name>" in a test file inside this
 * package. This catches a future refactor that silently drops a handler
 * along with the only test that exercised it.
 */
const WALKER_COMMANDS = [
  'init',
  'run',
  'destination',
  'hook',
  'consent',
  'config',
  'on',
  'user',
] as const;

const TEST_DIR = __dirname;

function readAllTestFiles(): string {
  const files = fs
    .readdirSync(TEST_DIR)
    .filter((name) => name.endsWith('.test.ts'));
  return files
    .map((name) => fs.readFileSync(path.join(TEST_DIR, name), 'utf8'))
    .join('\n');
}

describe('walker command coverage', () => {
  const combined = readAllTestFiles();

  for (const command of WALKER_COMMANDS) {
    test(`"walker ${command}" appears in at least one test file`, () => {
      expect(combined).toContain(`walker ${command}`);
    });
  }
});
