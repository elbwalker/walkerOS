import '../../../__tests__/helpers/setup-msw.js';
import { server } from '../../../__tests__/helpers/msw-server.js';
import { http, HttpResponse } from 'msw';
import { Writable } from 'node:stream';
import {
  EXIT,
  filterOperations,
  listOperations,
  referencedComponents,
  runApiList,
} from '../index.js';

const APP = 'https://app.example.test';

const DOCUMENT = {
  openapi: '3.1.0',
  info: { title: 'walkerOS', version: 'public' },
  paths: {
    '/api/projects/{projectId}/flows/{flowId}': {
      parameters: [{ name: 'flowId', in: 'path' }],
      get: {
        summary: 'Get flow',
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Flow' },
              },
            },
          },
        },
      },
    },
    '/api/health': { get: { summary: 'Health' } },
    '/api/projects/{projectId}/flows/{flowId}/deploy': {
      post: { summary: 'Deploy flow' },
    },
  },
  components: {
    schemas: {
      Flow: {
        type: 'object',
        properties: { config: { $ref: '#/components/schemas/Config' } },
      },
      Config: { type: 'object' },
      Unused: { type: 'string' },
    },
  },
};

function sink() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _e, done) {
      chunks.push(chunk.toString('utf-8'));
      done();
    },
  });
  return { stream, text: () => chunks.join('') };
}

const env = process.env;
beforeEach(() => {
  process.env = { ...env, WALKEROS_APP_URL: APP };
});
afterEach(() => {
  process.env = env;
});

describe('listOperations and filterOperations', () => {
  it('lists method operations only, sorted by path then method', () => {
    expect(
      listOperations(DOCUMENT).map((o) => `${o.method} ${o.path}`),
    ).toEqual([
      'GET /api/health',
      'GET /api/projects/{projectId}/flows/{flowId}',
      'POST /api/projects/{projectId}/flows/{flowId}/deploy',
    ]);
  });

  it.each([
    ['deploy', ['POST /api/projects/{projectId}/flows/{flowId}/deploy']],
    ['GET FLOW', ['GET /api/projects/{projectId}/flows/{flowId}']],
    [
      undefined,
      [
        'GET /api/health',
        'GET /api/projects/{projectId}/flows/{flowId}',
        'POST /api/projects/{projectId}/flows/{flowId}/deploy',
      ],
    ],
  ])('filters by %s, case-insensitive', (filter, expected) => {
    expect(
      filterOperations(listOperations(DOCUMENT), filter).map(
        (o) => `${o.method} ${o.path}`,
      ),
    ).toEqual(expected);
  });

  it('follows component references transitively and keeps nothing else', () => {
    const ops = filterOperations(listOperations(DOCUMENT), 'get flow');
    expect(referencedComponents(DOCUMENT, ops)).toEqual({
      schemas: {
        Flow: DOCUMENT.components.schemas.Flow,
        Config: DOCUMENT.components.schemas.Config,
      },
    });
  });
});

describe('runApiList', () => {
  it('prints one line per matching operation from the live document', async () => {
    server.use(
      http.get(`${APP}/api/openapi.json`, () => HttpResponse.json(DOCUMENT)),
    );
    const out = sink();
    const err = sink();
    expect(
      await runApiList(
        { filter: 'flow' },
        { stdout: out.stream, stderr: err.stream },
      ),
    ).toBe(EXIT.ok);
    expect(out.text()).toBe(
      'GET    /api/projects/{projectId}/flows/{flowId}  Get flow\n' +
        'POST   /api/projects/{projectId}/flows/{flowId}/deploy  Deploy flow\n',
    );
  });

  it('prints operations and their referenced components with --json', async () => {
    server.use(
      http.get(`${APP}/api/openapi.json`, () => HttpResponse.json(DOCUMENT)),
    );
    const out = sink();
    expect(
      await runApiList(
        { filter: 'get flow', json: true },
        { stdout: out.stream, stderr: sink().stream },
      ),
    ).toBe(EXIT.ok);
    const parsed: unknown = JSON.parse(out.text());
    expect(parsed).toMatchObject({
      operations: [
        {
          method: 'GET',
          path: '/api/projects/{projectId}/flows/{flowId}',
          summary: 'Get flow',
        },
      ],
      components: { schemas: { Flow: {}, Config: {} } },
    });
  });

  it.each([
    ['unreachable', () => HttpResponse.error(), EXIT.unreachable],
    ['a 503', () => HttpResponse.json({}, { status: 503 }), EXIT.http],
    ['not a document', () => HttpResponse.json({ hello: 'world' }), EXIT.http],
  ])('fails visibly when the document is %s', async (_label, answer, code) => {
    server.use(http.get(`${APP}/api/openapi.json`, answer));
    const err = sink();
    expect(
      await runApiList({}, { stdout: sink().stream, stderr: err.stream }),
    ).toBe(code);
    expect(err.text().trim().length).toBeGreaterThan(0);
  });
});
