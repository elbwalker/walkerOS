import {
  diagnostics,
  diagnosticsCommand,
} from '../../../commands/diagnostics/index.js';
import type { ContractComparison } from '../../../core/contract.js';
import { VERSION } from '../../../version.js';

const mockResolveAppUrl = jest.fn<string, []>();
const mockReadConfig = jest.fn<{ appUrl?: string } | null, []>();
jest.mock('../../../lib/config-file.js', () => ({
  resolveAppUrl: () => mockResolveAppUrl(),
  readConfig: () => mockReadConfig(),
}));

const mockCompareContract = jest.fn<Promise<ContractComparison>, [unknown]>();
jest.mock('../../../core/contract.js', () => ({
  ...jest.requireActual<typeof import('../../../core/contract.js')>(
    '../../../core/contract.js',
  ),
  compareContract: (input: unknown) => mockCompareContract(input),
}));

const CLIENT = {
  package: '@walkeros/cli',
  version: VERSION,
  contract: '4.7.0+1a2b3c4d',
};

const IN_SYNC: ContractComparison = {
  verdict: 'in-sync',
  appUrl: 'https://app.test',
  client: CLIENT,
  server: '4.7.0+5e6f7a8b',
  operations: 55,
  missing: [],
  changed: [],
};

const HEALTH = {
  status: 'ok',
  appVersion: 'abc1234',
  contractVersion: '4.7.0+1a2b3c4d',
  contractHash: 'f'.repeat(64),
  minSupportedClient: '4.7.0',
};

const realFetch = global.fetch;
let requests: Array<{ url: string; headers: Headers }>;
let stdout: string[];
let stdoutSpy: jest.SpyInstance;
let exitSpy: jest.SpyInstance;

function answerHealth(answer: unknown | Error): void {
  const mock: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), headers: new Headers(init?.headers) });
    if (answer instanceof Error) throw answer;
    return new Response(JSON.stringify(answer), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  global.fetch = mock;
}

beforeEach(() => {
  requests = [];
  stdout = [];
  delete process.env.WALKEROS_APP_URL;
  delete process.env.WALKEROS_TOKEN;
  mockResolveAppUrl.mockReturnValue('https://app.test/');
  mockReadConfig.mockReturnValue(null);
  mockCompareContract.mockResolvedValue(IN_SYNC);
  answerHealth(HEALTH);
  stdoutSpy = jest
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array): boolean => {
      stdout.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    });
  exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
});

afterEach(() => {
  global.fetch = realFetch;
  stdoutSpy.mockRestore();
  exitSpy.mockRestore();
  jest.clearAllMocks();
});

describe('walkeros diagnostics', () => {
  it('prints the cli, the app, its health and the contract line', async () => {
    await diagnosticsCommand({});
    expect(stdout.join('')).toBe(
      [
        `cli ${VERSION}`,
        'app https://app.test (default)',
        'health reachable, status ok, app abc1234',
        'contract: in-sync (server 4.7.0+5e6f7a8b, client 4.7.0+1a2b3c4d, 55 operations)',
        '',
      ].join('\n'),
    );
  });

  it('probes health and compares the contract on the same app', async () => {
    await diagnostics();
    expect(requests.map((r) => r.url)).toEqual(['https://app.test/api/health']);
    expect(mockCompareContract).toHaveBeenCalledWith({
      baseUrl: 'https://app.test',
    });
  });

  it('prints an unreachable app with the reason', async () => {
    answerHealth(
      new TypeError('fetch failed', {
        cause: Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }),
      }),
    );
    mockCompareContract.mockResolvedValue({
      verdict: 'unknown',
      appUrl: 'https://app.test',
      client: CLIENT,
      reason: 'GET https://app.test/api/health: fetch failed (ECONNREFUSED)',
    });
    await diagnosticsCommand({});
    const lines = stdout.join('').split('\n');
    expect(lines[2]).toBe('health unreachable (fetch failed (ECONNREFUSED))');
    expect(lines[3]).toBe(
      'contract: unknown (GET https://app.test/api/health: fetch failed (ECONNREFUSED))',
    );
  });

  it('prints the HTTP status of a non-2xx health answer', async () => {
    const mock: typeof fetch = async () =>
      new Response('<html>unavailable</html>', { status: 503 });
    global.fetch = mock;
    await diagnosticsCommand({});
    expect(stdout.join('').split('\n')[2]).toBe('health reachable, HTTP 503');
  });

  it('prints { cli, appUrl, app, contract } with --json', async () => {
    await diagnosticsCommand({ json: true });
    expect(JSON.parse(stdout.join(''))).toEqual({
      cli: { version: VERSION },
      appUrl: { resolved: 'https://app.test', source: 'default' },
      app: { reachable: true, ...HEALTH },
      contract: IN_SYNC,
    });
  });

  it.each([
    ['env', { env: 'https://env.test' }],
    ['config', { config: 'https://config.test' }],
    ['default', {}],
  ])(
    'names the app URL source %s',
    async (source, given: { env?: string; config?: string }) => {
      if (given.env) process.env.WALKEROS_APP_URL = given.env;
      if (given.config)
        mockReadConfig.mockReturnValue({ appUrl: given.config });
      const out = await diagnostics();
      expect(out.appUrl.source).toBe(source);
    },
  );

  it('works logged out and sends no credential', async () => {
    process.env.WALKEROS_TOKEN = 'secret-token';
    await diagnosticsCommand({});
    expect(requests).toHaveLength(1);
    expect(requests[0].headers.has('authorization')).toBe(false);
  });

  it.each<ContractComparison['verdict']>([
    'client-outdated',
    'server-older',
    'changed',
    'unknown',
  ])('exits 0 on %s', async (verdict) => {
    mockCompareContract.mockResolvedValue({ ...IN_SYNC, verdict });
    await expect(diagnosticsCommand({})).resolves.toBeUndefined();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(process.exitCode ?? 0).toBe(0);
  });
});
