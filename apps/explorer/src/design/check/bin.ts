import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from './cli';

const write =
  (stream: NodeJS.WriteStream) =>
  (line: string): void => {
    stream.write(`${line}\n`);
  };

try {
  process.exitCode = main(process.argv.slice(2), {
    cwd: process.cwd(),
    // dist/design: the bin ships beside tokens.css, tailwind.css and base.css.
    designDir: dirname(fileURLToPath(import.meta.url)),
    out: write(process.stdout),
    err: write(process.stderr),
  });
} catch (error) {
  // An unexpected failure is a misconfiguration (exit 2), never "findings" (1) or clean (0).
  process.stderr.write(
    `walkeros-design-check: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 2;
}
