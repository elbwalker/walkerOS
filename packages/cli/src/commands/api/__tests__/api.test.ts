import '../../../__tests__/helpers/setup-msw.js';
import { server } from '../../../__tests__/helpers/msw-server.js';
import { http, HttpResponse } from 'msw';
import { Readable, Writable } from 'node:stream';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import {
  EXIT,
  registerApiCommand,
  runApi,
  type ApiCommandIO,
} from '../index.js';
import {
  resetClientContext,
  setClientContext,
} from '../../../core/client-context.js';

const APP = 'https://app.example.test';

/** A writable that keeps what it got and says when the first chunk came. */
function sink() {
  const chunks: Buffer[] = [];
  let first: () => void = () => {};
  const firstChunk = new Promise<void>((resolve) => {
    first = resolve;
  });
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      chunks.push(Buffer.from(chunk));
      first();
      done();
    },
  });
  return {
    stream,
    firstChunk,
    text: () => Buffer.concat(chunks).toString('utf-8'),
  };
}

function streams(stdin = '') {
  const out = sink();
  const err = sink();
  const io: ApiCommandIO = {
    stdout: out.stream,
    stderr: err.stream,
    stdin: Readable.from([Buffer.from(stdin)]),
  };
  return { io, out, err };
}

/** Counts every request msw sees, so a case can prove nothing was sent. */
function countRequests(): () => number {
  let calls = 0;
  server.use(
    http.all('*', () => {
      calls += 1;
      return HttpResponse.json({}, { status: 200 });
    }),
  );
  return () => calls;
}

const env = process.env;

beforeEach(() => {
  process.env = {
    ...env,
    WALKEROS_APP_URL: APP,
    WALKEROS_TOKEN: 'wos_pat_test',
    XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'walkeros-api-')),
  };
  delete process.env.WALKEROS_PROJECT_ID;
  setClientContext({ type: 'cli', version: '9.9.9' });
});

afterEach(() => {
  process.env = env;
  resetClientContext();
  process.exitCode = undefined;
});

describe('walkeros api: exit codes by answer', () => {
  it.each([
    [200, EXIT.ok],
    [201, EXIT.ok],
    [204, EXIT.ok],
    [400, EXIT.http],
    [403, EXIT.http],
    [404, EXIT.http],
    [426, EXIT.http],
    [500, EXIT.http],
    [401, EXIT.auth],
  ])('HTTP %i exits %i, body on stdout unchanged', async (status, code) => {
    const body =
      status === 204
        ? null
        : JSON.stringify({
            error: { code: `C${status}`, message: `m${status}` },
          });
    server.use(
      http.get(`${APP}/api/x`, () => new HttpResponse(body, { status })),
    );
    const { io, out, err } = streams();
    expect(
      await runApi({ method: 'GET', path: '/api/x', header: [] }, io),
    ).toBe(code);
    expect(out.text()).toBe(body ?? '');
    if (code === EXIT.ok) {
      expect(err.text()).toBe('');
    } else {
      expect(err.text().trim().split('\n')).toHaveLength(1);
      expect(err.text()).toContain(`HTTP ${status}`);
      expect(err.text()).toContain(`m${status}`);
    }
  });

  it('exits 4 when the app cannot be reached', async () => {
    server.use(http.get(`${APP}/api/x`, () => HttpResponse.error()));
    const { io, err } = streams();
    expect(
      await runApi({ method: 'GET', path: '/api/x', header: [] }, io),
    ).toBe(EXIT.unreachable);
    expect(err.text()).toMatch(/could not reach/i);
  });

  it('exits 3 without a credential and sends nothing', async () => {
    delete process.env.WALKEROS_TOKEN;
    const calls = countRequests();
    const { io, err } = streams();
    expect(
      await runApi({ method: 'GET', path: '/api/x', header: [] }, io),
    ).toBe(EXIT.auth);
    expect(calls()).toBe(0);
    expect(err.text()).toBe(
      'walkeros api: no token: set WALKEROS_TOKEN to a token from Account > Automation tokens in the walkerOS app\n',
    );
  });

  it('prints a non-JSON error body exactly as it came', async () => {
    const html = '<html><body>Bad Gateway</body></html>';
    server.use(
      http.get(
        `${APP}/api/x`,
        () =>
          new HttpResponse(html, {
            status: 502,
            headers: { 'Content-Type': 'text/html' },
          }),
      ),
    );
    const { io, out, err } = streams();
    expect(
      await runApi({ method: 'GET', path: '/api/x', header: [] }, io),
    ).toBe(EXIT.http);
    expect(out.text()).toBe(html);
    expect(err.text().trim()).toMatch(/^walkeros api: HTTP 502/);
  });

  it('writes a streamed answer as it arrives, before the stream ends', async () => {
    let release: () => void = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const encoder = new TextEncoder();
    server.use(
      http.get(
        `${APP}/api/stream`,
        () =>
          new HttpResponse(
            new ReadableStream<Uint8Array>({
              async start(controller) {
                controller.enqueue(
                  encoder.encode('event: status\ndata: deploying\n\n'),
                );
                await released;
                controller.enqueue(
                  encoder.encode('event: status\ndata: active\n\n'),
                );
                controller.close();
              },
            }),
            { headers: { 'Content-Type': 'text/event-stream' } },
          ),
      ),
    );
    const { io, out } = streams();
    const run = runApi({ method: 'GET', path: '/api/stream', header: [] }, io);
    try {
      const arrived = await Promise.race([
        out.firstChunk.then(() => true),
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), 2000),
        ),
      ]);
      expect(arrived).toBe(true);
      expect(out.text()).toBe('event: status\ndata: deploying\n\n');
    } finally {
      release();
    }
    expect(await run).toBe(EXIT.ok);
    expect(out.text()).toBe(
      'event: status\ndata: deploying\n\nevent: status\ndata: active\n\n',
    );
  });
});

describe('walkeros api: usage errors exit 2 and send nothing', () => {
  it.each([
    ['an unknown method', { method: 'FETCH', path: '/api/x', header: [] }],
    [
      'a path without a leading slash',
      { method: 'GET', path: 'api/x', header: [] },
    ],
    ['DELETE without --yes', { method: 'DELETE', path: '/api/x', header: [] }],
    [
      '--data on GET',
      { method: 'GET', path: '/api/x', header: [], data: '{}' },
    ],
    [
      'a header without a colon',
      { method: 'GET', path: '/api/x', header: ['NoColon'] },
    ],
    [
      'an unreadable --data file',
      {
        method: 'POST',
        path: '/api/x',
        header: [],
        data: '@/does/not/exist.json',
      },
    ],
    [
      '{projectId} with no project',
      { method: 'GET', path: '/api/projects/{projectId}', header: [] },
    ],
    [
      'another placeholder left',
      { method: 'GET', path: '/api/flows/{flowId}', header: [] },
    ],
  ])('%s', async (_label, options) => {
    const calls = countRequests();
    const { io, err } = streams();
    expect(await runApi(options, io)).toBe(EXIT.usage);
    expect(calls()).toBe(0);
    expect(err.text().trim().length).toBeGreaterThan(0);
  });

  it('a credential bound for a plain http remote app', async () => {
    process.env.WALKEROS_APP_URL = 'http://app.example.test';
    const calls = countRequests();
    const { io, err } = streams();
    expect(
      await runApi({ method: 'GET', path: '/api/x', header: [] }, io),
    ).toBe(EXIT.usage);
    expect(calls()).toBe(0);
    expect(err.text()).toMatch(/plain http/);
  });

  it.each(['Authorization: Bearer x', 'authorization: Bearer x'])(
    'a token in a header: %s',
    async (header) => {
      delete process.env.WALKEROS_TOKEN;
      const calls = countRequests();
      const { io, err } = streams();
      expect(
        await runApi({ method: 'GET', path: '/api/x', header: [header] }, io),
      ).toBe(EXIT.usage);
      expect(calls()).toBe(0);
      expect(err.text()).toBe(
        'walkeros api: set the token with WALKEROS_TOKEN, not with an Authorization header\n',
      );
    },
  );
});

describe('walkeros api: the request', () => {
  it('sends DELETE with --yes', async () => {
    let method = '';
    server.use(
      http.delete(`${APP}/api/x`, ({ request }) => {
        method = request.method;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { io } = streams();
    expect(
      await runApi(
        { method: 'delete', path: '/api/x', header: [], yes: true },
        io,
      ),
    ).toBe(EXIT.ok);
    expect(method).toBe('DELETE');
  });

  it.each([
    ['--project', { project: 'proj_a/b' }, undefined, 'proj_a%2Fb'],
    ['WALKEROS_PROJECT_ID', {}, 'proj_env', 'proj_env'],
    [
      '--project over WALKEROS_PROJECT_ID',
      { project: 'proj_flag' },
      'proj_env',
      'proj_flag',
    ],
  ])(
    'fills {projectId} from %s',
    async (_label, flags, envProject, expected) => {
      if (envProject) process.env.WALKEROS_PROJECT_ID = envProject;
      let url = '';
      server.use(
        http.get(`${APP}/api/projects/:projectId/flows`, ({ request }) => {
          url = request.url;
          return HttpResponse.json([]);
        }),
      );
      const { io } = streams();
      expect(
        await runApi(
          {
            method: 'GET',
            path: '/api/projects/{projectId}/flows?limit=5',
            header: [],
            ...flags,
          },
          io,
        ),
      ).toBe(EXIT.ok);
      expect(url).toBe(`${APP}/api/projects/${expected}/flows?limit=5`);
    },
  );

  it.each([
    ['stdin', '-', '{"name":"from stdin"}'],
    ['a file', 'FILE', '{"name":"from file"}'],
    ['the argument', '{"name":"inline"}', '{"name":"inline"}'],
  ])(
    'sends --data from %s unchanged, with the headers',
    async (_label, data, body) => {
      let seen: { body: string; headers: Headers } | undefined;
      server.use(
        http.post(`${APP}/api/x`, async ({ request }) => {
          seen = { body: await request.text(), headers: request.headers };
          return HttpResponse.json({ ok: true }, { status: 201 });
        }),
      );
      let dataArg = data;
      if (data === 'FILE') {
        const file = join(
          mkdtempSync(join(tmpdir(), 'walkeros-api-data-')),
          'body.json',
        );
        writeFileSync(file, body);
        dataArg = `@${file}`;
      }
      const { io } = streams(data === '-' ? body : '');
      expect(
        await runApi(
          {
            method: 'POST',
            path: '/api/x',
            data: dataArg,
            header: ['Idempotency-Key: run-1', 'X-Extra: a: b'],
          },
          io,
        ),
      ).toBe(EXIT.ok);
      expect(seen?.body).toBe(body);
      expect(seen?.headers.get('content-type')).toBe('application/json');
      expect(seen?.headers.get('idempotency-key')).toBe('run-1');
      expect(seen?.headers.get('x-extra')).toBe('a: b');
      expect(seen?.headers.get('authorization')).toBe('Bearer wos_pat_test');
      expect(seen?.headers.get('x-walkeros-client')).toBe('cli');
      expect(seen?.headers.get('x-walkeros-client-version')).toBe('9.9.9');
    },
  );
});

describe('walkeros api: wiring', () => {
  class Exit extends Error {
    constructor(readonly code: number) {
      super(`exit ${code}`);
    }
  }
  const exit = (code: number): never => {
    throw new Exit(code);
  };

  it('runs the request and sets the exit code', async () => {
    server.use(
      http.get(`${APP}/api/x`, () => HttpResponse.json({}, { status: 404 })),
    );
    const program = new Command().exitOverride();
    registerApiCommand(program, exit);
    await program.parseAsync(['api', 'GET', '/api/x'], { from: 'user' });
    expect(process.exitCode).toBe(EXIT.http);
  });

  it('dispatches api ls rather than reading ls as a method', async () => {
    server.use(
      http.get(`${APP}/api/openapi.json`, () =>
        HttpResponse.json({
          paths: { '/api/health': { get: { summary: 'Health' } } },
        }),
      ),
    );
    const program = new Command().exitOverride();
    registerApiCommand(program, exit);
    await program.parseAsync(['api', 'ls', 'health'], { from: 'user' });
    expect(process.exitCode).toBe(EXIT.ok);
  });

  it.each([[['api']], [['api', 'GET', '/api/x', '--bogus']]])(
    'exits 2 on a commander usage error: %j',
    async (argv) => {
      const program = new Command().exitOverride();
      registerApiCommand(program, exit);
      await expect(
        program.parseAsync(argv, { from: 'user' }),
      ).rejects.toMatchObject({
        code: EXIT.usage,
      });
    },
  );
});
