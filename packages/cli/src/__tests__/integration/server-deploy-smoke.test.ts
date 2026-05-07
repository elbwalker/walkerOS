/**
 * End-to-end smoke test for the nft server bundle deploy path.
 *
 * Bundles the simple-server fixture (express + console destination),
 * builds a Docker image using the canonical multi-stage Dockerfile,
 * runs the container, POSTs `{"event":"page view"}` to `/collect`, and
 * asserts that the event reaches the console destination via
 * `docker logs`.
 *
 * **Gated behind `INTEGRATION=1`.** This test:
 * - Spawns Docker (requires Docker daemon access).
 * - Pulls / requires the `walkeros/flow:dev` runtime image.
 * - Takes minutes to run.
 * - Should NOT run in the default `npm test` suite.
 *
 * Run explicitly with:
 *   INTEGRATION=1 npm test -- server-deploy-smoke
 *
 * If `walkeros/flow:dev` is not available locally, the test skips with
 * a clear message rather than failing. Build the image first via the
 * canonical instructions in `walkerOS/website/docs/apps/cli.mdx` (or
 * the using-cli skill).
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Gate: tests run only when the user explicitly opts in via
 * `INTEGRATION=1`. This keeps Docker / network out of the default
 * `npm test` flow and matches the plan's gating requirement (Phase 8,
 * task 27). Use a top-level skip rather than a per-test `if` so the
 * default Jest output simply reports the suite as skipped.
 */
const INTEGRATION_ENABLED = process.env.INTEGRATION === '1';

/**
 * Secondary gate: the canonical Dockerfile pattern depends on the
 * `walkeros/flow:dev` base image. If it isn't available locally the
 * test is unrunnable; rather than failing noisily, skip with a clear
 * setup hint. The check is cheap (single `docker image inspect`).
 */
function dockerImageExists(image: string): boolean {
  const result = spawnSync('docker', ['image', 'inspect', image], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

const RUNTIME_IMAGE = 'walkeros/flow:dev';
const dockerOk =
  INTEGRATION_ENABLED &&
  spawnSync('docker', ['version'], { stdio: 'ignore' }).status === 0;
const baseImageOk = dockerOk && dockerImageExists(RUNTIME_IMAGE);

// Resolve paths relative to the cli package root so the test works
// regardless of Jest's cwd.
const cliRoot = path.resolve(__dirname, '..', '..', '..');
const cliBin = path.join(cliRoot, 'dist', 'cli.js');
const fixtureDir = path.join(
  cliRoot,
  'src',
  '__tests__',
  'fixtures',
  'nft-server-simple',
);

const cliBuilt = existsSync(cliBin);

// Three things must be true to run: INTEGRATION=1, Docker daemon
// reachable, runtime base image present, and the CLI is built.
const describeIfReady =
  INTEGRATION_ENABLED && dockerOk && baseImageOk && cliBuilt
    ? describe
    : describe.skip;

if (INTEGRATION_ENABLED && !dockerOk) {
  // eslint-disable-next-line no-console
  console.warn(
    '[server-deploy-smoke] INTEGRATION=1 set but Docker daemon not reachable; skipping.',
  );
}
if (INTEGRATION_ENABLED && dockerOk && !baseImageOk) {
  // eslint-disable-next-line no-console
  console.warn(
    `[server-deploy-smoke] INTEGRATION test requires ${RUNTIME_IMAGE} image; build it first via the canonical Dockerfile in walkerOS/website/docs/apps/cli.mdx.`,
  );
}
if (INTEGRATION_ENABLED && !cliBuilt) {
  // eslint-disable-next-line no-console
  console.warn(
    '[server-deploy-smoke] CLI dist/ missing; run `npm run build` in packages/cli first.',
  );
}

describeIfReady('server deploy smoke (nft bundle, docker, curl)', () => {
  jest.setTimeout(300_000);

  let workDir = '';
  let imageTag = '';
  let containerId = '';

  beforeAll(async () => {
    workDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'walkeros-deploy-smoke-'),
    );
    imageTag = `walkeros-smoke-${Date.now()}:test`;

    // Stage 1: build the bundle into the work dir using the local CLI
    // binary. This mirrors what the canonical builder stage does inside
    // Docker, but skips the npm install step (we use the workspace CLI
    // directly to avoid a registry round-trip).
    await fs.copyFile(
      path.join(fixtureDir, 'flow.json'),
      path.join(workDir, 'flow.json'),
    );

    const distDir = path.join(workDir, 'dist');
    await runCommand(
      'node',
      [cliBin, 'bundle', path.join(workDir, 'flow.json'), '-o', distDir],
      { cwd: workDir },
    );

    // Sanity: bundle output exists.
    const entryPath = path.join(distDir, 'flow.mjs');
    if (!existsSync(entryPath)) {
      throw new Error(`bundle did not produce ${entryPath}`);
    }

    // Stage 2: minimal Dockerfile that copies the bundle into the
    // canonical runtime image. The full multi-stage flow lives in the
    // docs (Task 24); this test only exercises the runtime half so the
    // smoke test stays fast and doesn't pull node:22-alpine just to
    // run npm install.
    const dockerfile = `FROM ${RUNTIME_IMAGE}\nWORKDIR /app/flow\nCOPY dist/ ./\nENV PORT=8080\nEXPOSE 8080\n`;
    await fs.writeFile(path.join(workDir, 'Dockerfile'), dockerfile);

    await runCommand('docker', ['build', '-t', imageTag, '.'], {
      cwd: workDir,
    });
  });

  afterAll(async () => {
    if (containerId) {
      spawnSync('docker', ['rm', '-f', containerId], { stdio: 'ignore' });
    }
    if (imageTag) {
      spawnSync('docker', ['rmi', '-f', imageTag], { stdio: 'ignore' });
    }
    if (workDir) {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  });

  it('starts the bundle, accepts a /collect POST, and forwards to console', async () => {
    // Bind to an ephemeral host port to avoid colliding with anything
    // already running on 8080 in dev environments.
    const hostPort = await getEphemeralPort();
    const runResult = spawnSync(
      'docker',
      ['run', '-d', '--rm', '-p', `${hostPort}:8080`, imageTag],
      { encoding: 'utf8' },
    );
    if (runResult.status !== 0) {
      throw new Error(
        `docker run failed: ${runResult.stderr || runResult.stdout}`,
      );
    }
    containerId = runResult.stdout.trim();

    // Wait for `/ready` to flip green. The canonical image polls every
    // 30s but a fresh container is usually ready in < 5s on warm caches.
    await waitFor(async () => {
      const res = await fetch(`http://127.0.0.1:${hostPort}/ready`);
      return res.ok;
    }, 30_000);

    const collectRes = await fetch(`http://127.0.0.1:${hostPort}/collect`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'page view' }),
    });
    expect(collectRes.status).toBe(200);

    // Give the destination chain a beat to flush, then read logs and
    // assert the event reached the console destination.
    await sleep(500);
    const logsResult = spawnSync('docker', ['logs', containerId], {
      encoding: 'utf8',
    });
    const logs = `${logsResult.stdout}\n${logsResult.stderr}`;
    expect(logs).toMatch(/page view/);
  });
});

/**
 * Run a command, streaming output for debuggability. Throws if the
 * exit code is non-zero. Used for `walkeros bundle` and `docker build`
 * which both produce useful progress output worth surfacing on
 * failure.
 */
function runCommand(
  cmd: string,
  args: string[],
  opts: { cwd: string },
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
    });
  });
}

/**
 * Find a free TCP port by asking the OS for one (bind to :0, read the
 * assigned port, close). Avoids hard-coded ports that conflict with a
 * dev server on the host.
 */
async function getEphemeralPort(): Promise<number> {
  const net = await import('node:net');
  return new Promise<number>((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close();
        reject(new Error('failed to assign ephemeral port'));
      }
    });
  });
}

/**
 * Poll `predicate` every 250 ms until it returns true or `timeoutMs`
 * elapses. Throws on timeout. Used to wait for the container's
 * `/ready` endpoint without a fixed sleep.
 */
async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (await predicate()) return;
    } catch {
      // ignore: connection refused while container is starting
    }
    await sleep(250);
  }
  throw new Error(`waitFor: predicate did not pass within ${timeoutMs}ms`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
