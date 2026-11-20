import {
  isChildMessage,
  isSupervisorMessage,
  type ChildMessage,
  type ChildReport,
  type ChildStart,
  type SignAnswer,
  type SignRequest,
  type SupervisorMessage,
} from '../../remote/ipc.js';

const START: ChildStart = {
  type: 'start',
  instanceId: '3f9a2b7c1d4e5f60',
  sequence: 17,
  flowFile: '/tmp/walkeros-abc/releases/17/flow.mjs',
  folder: '/tmp/walkeros-abc',
  port: 8080,
  values: { API_KEY: 'value-api-key-v17' },
  known: ['value-api-key-v16'],
};

const REPORT: ChildReport = {
  type: 'report',
  reason: 'asked',
  counters: {
    in: 3,
    out: 2,
    failed: 1,
    destinations: {
      api: { count: 2, failed: 1, duration: 40, dlqSize: 0, dropped: 0 },
    },
  },
  release: 'dv_r17',
  errors: [
    {
      message: 'Push failed',
      count: 1,
      firstSeen: '2026-11-18T10:00:00.000Z',
      lastSeen: '2026-11-18T10:00:00.000Z',
    },
  ],
  logs: [
    {
      time: '2026-11-18T10:00:00.000Z',
      level: 'info',
      message: 'Flow running',
    },
  ],
};

const SIGN: SignRequest = {
  type: 'sign',
  id: 0,
  method: 'POST',
  url: 'https://ingest.example.test/events',
  contentDigest: 'sha-256=:47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=:',
};

const SIGNED: SignAnswer = {
  type: 'signed',
  id: 0,
  headers: {
    'Signature-Input':
      'walkeros=("@method" "@target-uri" "content-digest");created=1795200000;keyid="k";nonce="n";tag="walkeros-ingest"',
    Signature: 'walkeros=:c2lnbmF0dXJl:',
  },
};

const SIGN_REFUSED: SignAnswer = {
  type: 'sign-refused',
  id: 0,
  message: 'The door signer signs POST requests only',
};

const SUPERVISOR_PASSES: Array<[string, SupervisorMessage]> = [
  ['a start', START],
  [
    'a start with the terminal flags',
    { ...START, verbose: true, silent: false, json: true },
  ],
  [
    'a start with no values and nothing known',
    { ...START, values: {}, known: [] },
  ],
  ['a report ask', { type: 'report' }],
  ['a signed answer', SIGNED],
  [
    'a signed answer with headers of 1024 characters',
    {
      ...SIGNED,
      id: Number.MAX_SAFE_INTEGER,
      headers: {
        'Signature-Input': 'i'.repeat(1024),
        Signature: 's'.repeat(1024),
      },
    },
  ],
  ['a sign refusal', SIGN_REFUSED],
  [
    'a sign refusal of 1024 characters',
    { ...SIGN_REFUSED, message: 'x'.repeat(1024) },
  ],
];

const SUPERVISOR_FAILS: Array<[string, unknown]> = [
  ['an unknown type', { ...START, type: 'begin' }],
  ['no type', { instanceId: START.instanceId }],
  ['a missing field', { ...START, flowFile: undefined }],
  ['a value that is not a string', { ...START, values: { API_KEY: 17 } }],
  ['values that are not an object', { ...START, values: ['API_KEY'] }],
  ['a known value that is not a string', { ...START, known: [17] }],
  ['a sequence that is not an integer', { ...START, sequence: 17.5 }],
  ['a sequence that is a string', { ...START, sequence: '17' }],
  ['a port that is not an integer', { ...START, port: '8080' }],
  ['a flag that is not a boolean', { ...START, json: 'yes' }],
  ['null', null],
  ['a string', 'start'],
  [
    'a signed answer with a third header name',
    {
      ...SIGNED,
      headers: { ...SIGNED.headers, 'Content-Digest': SIGN.contentDigest },
    },
  ],
  [
    'a signed answer with one header name',
    { ...SIGNED, headers: { Signature: SIGNED.headers.Signature } },
  ],
  [
    'a signed answer with a header of 1025 characters',
    { ...SIGNED, headers: { ...SIGNED.headers, Signature: 's'.repeat(1025) } },
  ],
  ['a signed answer without an id', { ...SIGNED, id: undefined }],
  ['a signed answer with a negative id', { ...SIGNED, id: -1 }],
  ['a sign refusal without an id', { ...SIGN_REFUSED, id: undefined }],
  ['a sign refusal without a message', { ...SIGN_REFUSED, message: undefined }],
  [
    'a sign refusal of 1025 characters',
    { ...SIGN_REFUSED, message: 'x'.repeat(1025) },
  ],
  ['a sign request sent to the child', SIGN],
];

describe('isSupervisorMessage', () => {
  it.each<[string, boolean, unknown]>([
    ...SUPERVISOR_PASSES.map(([name, value]): [string, boolean, unknown] => [
      name,
      true,
      value,
    ]),
    ...SUPERVISOR_FAILS.map(([name, value]): [string, boolean, unknown] => [
      name,
      false,
      value,
    ]),
  ])('answers %s with %s', (_case, expected, value) => {
    expect(isSupervisorMessage(value)).toBe(expected);
  });
});

const CHILD_PASSES: Array<[string, ChildMessage]> = [
  [
    'a report at its bounds: 50 errors and 100 lines',
    {
      ...REPORT,
      errors: Array.from({ length: 50 }, () => REPORT.errors[0]),
      logs: Array.from({ length: 100 }, () => REPORT.logs[0]),
    },
  ],
  [
    'a failure of 1024 characters with 64 names',
    {
      type: 'failed',
      message: 'x'.repeat(1024),
      refused: Array.from({ length: 64 }, () => ({
        name: 'API_KEY',
        reason: 'secret-in-env' as const,
      })),
    },
  ],
  ['a format', { type: 'format', format: 'json' }],
  ['ready', { type: 'ready' }],
  ['a failure', { type: 'failed', message: 'bad bundle' }],
  [
    'a failure with refused names',
    {
      type: 'failed',
      message: 'Secrets refused: API_KEY (secret-in-env)',
      refused: [{ name: 'API_KEY', reason: 'secret-in-env' }],
    },
  ],
  ['a report', REPORT],
  [
    'a report without counters or release',
    { type: 'report', reason: 'new-error', errors: [], logs: [] },
  ],
  ['a sign', SIGN],
  [
    'a sign at its bounds: method 16, url 2048, digest 128 characters',
    {
      ...SIGN,
      id: Number.MAX_SAFE_INTEGER,
      method: 'M'.repeat(16),
      url: 'u'.repeat(2048),
      contentDigest: 'd'.repeat(128),
    },
  ],
];

const CHILD_FAILS: Array<[string, unknown]> = [
  [
    'a report of 51 errors',
    { ...REPORT, errors: Array.from({ length: 51 }, () => REPORT.errors[0]) },
  ],
  [
    'a report of 101 lines',
    { ...REPORT, logs: Array.from({ length: 101 }, () => REPORT.logs[0]) },
  ],
  [
    'a failure with 65 names',
    {
      type: 'failed',
      message: 'x',
      refused: Array.from({ length: 65 }, () => ({
        name: 'API_KEY',
        reason: 'secret-in-env',
      })),
    },
  ],
  [
    'a failure of 1025 characters',
    { type: 'failed', message: 'x'.repeat(1025) },
  ],
  [
    'a line of 1025 characters',
    { ...REPORT, logs: [{ ...REPORT.logs[0], message: 'x'.repeat(1025) }] },
  ],
  ['a release of 1025 characters', { ...REPORT, release: 'r'.repeat(1025) }],
  ['an unknown type', { type: 'started' }],
  ['a format that is not one', { type: 'format', format: 'yaml' }],
  ['a failure without a message', { type: 'failed' }],
  [
    'a refused reason that is not a secret check',
    {
      type: 'failed',
      message: 'x',
      refused: [{ name: 'API_KEY', reason: 'artifact-sha256' }],
    },
  ],
  ['a report with errors that are not an array', { ...REPORT, errors: {} }],
  ['a report with logs that are not an array', { ...REPORT, logs: 'x' }],
  ['a report with an unknown reason', { ...REPORT, reason: 'tick' }],
  [
    'a report with an error entry missing its count',
    { ...REPORT, errors: [{ ...REPORT.errors[0], count: undefined }] },
  ],
  [
    'a report with a line at an unknown level',
    { ...REPORT, logs: [{ ...REPORT.logs[0], level: 'trace' }] },
  ],
  [
    'a report with counters that are not numbers',
    { ...REPORT, counters: { ...REPORT.counters, in: '3' } },
  ],
  [
    'a report with a destination counter missing a figure',
    {
      ...REPORT,
      counters: {
        ...REPORT.counters,
        destinations: { api: { count: 2, failed: 1, duration: 40 } },
      },
    },
  ],
  ['a report with a release that is not a string', { ...REPORT, release: 17 }],
  ['undefined', undefined],
  ['a sign without an id', { ...SIGN, id: undefined }],
  ['a sign without a method', { ...SIGN, method: undefined }],
  ['a sign without a url', { ...SIGN, url: undefined }],
  ['a sign without a content digest', { ...SIGN, contentDigest: undefined }],
  ['a sign with a negative id', { ...SIGN, id: -1 }],
  ['a sign with a fractional id', { ...SIGN, id: 1.5 }],
  ['a sign with a url of 2049 characters', { ...SIGN, url: 'u'.repeat(2049) }],
  [
    'a sign with a method of 17 characters',
    { ...SIGN, method: 'M'.repeat(17) },
  ],
  [
    'a sign with a content digest of 129 characters',
    { ...SIGN, contentDigest: 'd'.repeat(129) },
  ],
  ['a signed answer sent by the child', SIGNED],
];

describe('isChildMessage', () => {
  it.each<[string, boolean, unknown]>([
    ...CHILD_PASSES.map(([name, value]): [string, boolean, unknown] => [
      name,
      true,
      value,
    ]),
    ...CHILD_FAILS.map(([name, value]): [string, boolean, unknown] => [
      name,
      false,
      value,
    ]),
  ])('answers %s with %s', (_case, expected, value) => {
    expect(isChildMessage(value)).toBe(expected);
  });
});
