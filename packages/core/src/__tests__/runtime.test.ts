import {
  REFUSAL_CHECKS,
  declaredEnvOf,
  isDeclaredEnv,
  isReservedEnvName,
} from '../runtime';

describe('declaredEnvOf', () => {
  it.each<[string, unknown, { secrets: string[]; env: string[] }]>([
    [
      'a whole-string secret',
      { settings: { apiKey: '__WALKEROS_SECRET:API_KEY' } },
      { secrets: ['API_KEY'], env: [] },
    ],
    [
      'an inline env marker with a default',
      { url: 'https://__WALKEROS_ENV:HOST:localhost/x' },
      { secrets: [], env: ['HOST'] },
    ],
    [
      'two env markers in one string',
      { url: '__WALKEROS_ENV:SCHEME://__WALKEROS_ENV:DOMAIN:example.com' },
      { secrets: [], env: ['DOMAIN', 'SCHEME'] },
    ],
    [
      'the same names twice',
      {
        a: '__WALKEROS_SECRET:API_KEY',
        b: '__WALKEROS_SECRET:API_KEY',
        c: '__WALKEROS_ENV:HOST',
        d: 'x-__WALKEROS_ENV:HOST',
      },
      { secrets: ['API_KEY'], env: ['HOST'] },
    ],
    [
      'nested arrays and objects',
      {
        sources: {
          http: { config: { settings: { ports: ['__WALKEROS_ENV:PORT_A'] } } },
        },
        destinations: {
          bq: {
            config: {
              settings: {
                list: [[{ key: '__WALKEROS_SECRET:BQ_KEY' }]],
                table: '__WALKEROS_ENV:TABLE',
              },
            },
          },
        },
      },
      { secrets: ['BQ_KEY'], env: ['PORT_A', 'TABLE'] },
    ],
    [
      // The bundle emits a `$code:` value as raw code, so a marker inside it
      // is never read from the environment.
      'a $code: string',
      { fn: '$code:() => "__WALKEROS_ENV:IN_CODE"' },
      { secrets: [], env: [] },
    ],
    [
      'a plain string, numbers, booleans and null',
      { name: 'Demo', port: 8080, on: true, none: null },
      { secrets: [], env: [] },
    ],
    [
      'sorted output',
      [
        '__WALKEROS_ENV:ZETA',
        '__WALKEROS_ENV:ALPHA',
        '__WALKEROS_SECRET:Z_KEY',
      ],
      { secrets: ['Z_KEY'], env: ['ALPHA', 'ZETA'] },
    ],
  ])('reads %s', (_case, config, expected) => {
    expect(declaredEnvOf(config)).toEqual(expected);
  });
});

describe('isReservedEnvName', () => {
  // Written out, not read from the list: dropping a name turns its row red.
  it.each<[string, boolean]>([
    ['NODE_ENV', true],
    ['NODE_OPTIONS', true],
    ['PATH', true],
    ['HOME', true],
    ['USER', true],
    ['HOSTNAME', true],
    ['SHELL', true],
    ['LANG', true],
    ['TERM', true],
    ['TZ', true],
    ['TMPDIR', true],
    ['PORT', true],
    ['BUNDLE', true],
    ['CACHE_DIR', true],
    ['HEARTBEAT_INTERVAL', true],
    ['XDG_CACHE_HOME', true],
    ['LD_PRELOAD', true],
    ['LD_LIBRARY_PATH', true],
    ['LD_AUDIT', true],
    ['DYLD_INSERT_LIBRARIES', true],
    ['HTTP_PROXY', true],
    ['HTTPS_PROXY', true],
    ['NO_PROXY', true],
    ['ALL_PROXY', true],
    ['http_proxy', true],
    ['https_proxy', true],
    ['no_proxy', true],
    ['all_proxy', true],
    ['SSL_CERT_FILE', true],
    ['SSL_CERT_DIR', true],
    ['WALKEROS_X', true],
    ['NODE_X', true],
    ['NPM_X', true],
    ['API_KEY', false],
    ['NODEX', false],
    ['LDAP_URL', false],
    ['walkeros_x', false],
  ])('%s is reserved: %s', (name, reserved) => {
    expect(isReservedEnvName(name)).toBe(reserved);
  });
});

describe('isDeclaredEnv', () => {
  it.each<[string, unknown, boolean]>([
    ['both lists of names', { secrets: ['API_KEY'], env: ['HOST'] }, true],
    ['empty lists', { secrets: [], env: [] }, true],
    ['a missing key', { secrets: ['API_KEY'] }, false],
    ['a non-string name', { secrets: [7], env: [] }, false],
    ['a non-array', { secrets: 'API_KEY', env: [] }, false],
    ['undefined', undefined, false],
  ])('%s: %s', (_case, value, expected) => {
    expect(isDeclaredEnv(value)).toBe(expected);
  });
});

describe('REFUSAL_CHECKS', () => {
  // Written out, not read from the list: the names are a wire contract the
  // app reads from a runner's check-in, so a renamed or dropped one is red.
  it('names each refusal check once', () => {
    expect(REFUSAL_CHECKS).toEqual([
      'document-size',
      'document-format',
      'document-version',
      'deployment',
      'sequence',
      'release-id',
      'artifact-bytes',
      'artifact-sha256',
      'archive-entry',
      'secret-set',
      'secret-in-env',
      'secret-reserved',
      'secret-missing',
    ]);
  });
});
