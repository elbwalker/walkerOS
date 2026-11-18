import {
  isChildMessage,
  isSupervisorMessage,
  type ChildMessage,
  type ChildReport,
  type ChildStart,
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
