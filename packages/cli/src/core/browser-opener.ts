import { spawn, type ChildProcess, type SpawnOptions } from 'child_process';
import { browserUrlProblem } from './oauth-login.js';

/**
 * Open the sign-in page in the person's browser.
 *
 * The address holds several `&` and its host comes from the app's metadata, a
 * value a server supplies. So it is checked first (`browserUrlProblem`), and
 * no opener ever parses it as a command line: each is one executable with the
 * address as its own argument, spawned without a shell. On Windows that rules
 * out `cmd /c start`, which re-parses its line and runs whatever follows an
 * `&`; `rundll32 url.dll,FileProtocolHandler` takes the address as it is.
 */

export interface OpenerCommand {
  command: string;
  args: string[];
}

/**
 * The opener for this machine. `BROWSER`, when set, is one executable (VS
 * Code sets it to a helper that opens the host's browser from a dev
 * container); it is not split on spaces.
 */
export function browserCommand(
  url: string,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): OpenerCommand {
  const browser = env.BROWSER;
  if (browser) return { command: browser, args: [url] };
  if (platform === 'darwin') return { command: 'open', args: [url] };
  if (platform === 'win32')
    return {
      command: 'rundll32.exe',
      args: ['url.dll,FileProtocolHandler', url],
    };
  return { command: 'xdg-open', args: [url] };
}

export type OpenResult =
  | { kind: 'opened' }
  | { kind: 'refused'; problem: string }
  | { kind: 'failed'; reason: string };

export type Spawner = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcess;

/** Check the address, then run the opener detached; it never waits for the browser. */
export function openSignInPage(
  url: string,
  issuer: string,
  run: Spawner = spawn,
): Promise<OpenResult> {
  const problem = browserUrlProblem(url, issuer);
  if (problem !== null) return Promise.resolve({ kind: 'refused', problem });
  const { command, args } = browserCommand(url);
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = run(command, args, {
        detached: true,
        stdio: 'ignore',
        shell: false,
        windowsHide: true,
      });
    } catch (error) {
      resolve({
        kind: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    child.once('error', (error) =>
      resolve({ kind: 'failed', reason: `${command}: ${error.message}` }),
    );
    child.once('spawn', () => {
      child.unref();
      resolve({ kind: 'opened' });
    });
  });
}
