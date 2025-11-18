import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cliPath = require.resolve('@walkeros/cli');

const child = spawn('node', [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
