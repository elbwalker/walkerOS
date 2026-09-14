// The flow tools must refuse machine capability under the hosted runtime and
// behave unchanged under the local one. `@walkeros/cli` is mocked so a refusal
// can be told apart from a call that reached the cli layer, and so importing
// the cli root does not pull chalk (ESM only) into jest.
jest.mock('@walkeros/cli', () => ({
  loadJsonConfig: jest.fn(),
  validate: jest.fn(),
  bundle: jest.fn(),
  push: jest.fn(),
  simulateSource: jest.fn(),
  simulateTransformer: jest.fn(),
  simulateCollector: jest.fn(),
  simulateDestination: jest.fn(),
}));

jest.mock('@walkeros/cli/dev', () => {
  const { z } = require('zod');
  const stringField = z.string().optional();
  const shape = new Proxy({}, { get: () => stringField });
  return { schemas: new Proxy({}, { get: () => shape }) };
});

import * as cli from '@walkeros/cli';
import { createFlowExamplesToolSpec } from '../../tools/examples.js';
import { createFlowValidateToolSpec } from '../../tools/validate.js';
import { createFlowBundleToolSpec } from '../../tools/bundle.js';
import { createFlowSimulateToolSpec } from '../../tools/simulate.js';
import { createFlowPushToolSpec } from '../../tools/push.js';
import { createFlowLoadToolSpec } from '../../tools/flow-load.js';
import { createHostedRuntime } from '../hosted.js';
import { createLocalRuntime } from '../local.js';
import type { FlowRuntime } from '../types.js';
import { stubClient } from '../../__tests__/support/stub-client.js';

const client = stubClient();
const hosted = createHostedRuntime(client);
const local = createLocalRuntime();
const mocked = jest.mocked(cli);
const EVENT = { name: 'order complete' };
const INLINE = '{"version":4,"flows":{}}';

/** The cli function a tool reaches once its runtime lets the call through. */
type CliEntry =
  | 'loadJsonConfig'
  | 'validate'
  | 'bundle'
  | 'simulateDestination'
  | 'push';

function isRefusal(res: unknown): boolean {
  return (
    !!res &&
    typeof res === 'object' &&
    (res as { isError?: boolean }).isError === true &&
    /hosted/i.test(JSON.stringify(res))
  );
}

beforeEach(() => {
  jest.resetAllMocks();
});

interface Row {
  name: string;
  make: (rt: FlowRuntime) => { handler: (input: unknown) => Promise<unknown> };
  inline: Record<string, unknown>;
  path: Record<string, unknown>;
  url: Record<string, unknown>;
  ran: CliEntry;
}

// Tools that only READ a config.
const readTools: Row[] = [
  {
    name: 'flow_examples',
    make: (rt) => createFlowExamplesToolSpec(rt),
    inline: { configPath: INLINE },
    path: { configPath: '/etc/passwd' },
    url: { configPath: 'http://169.254.169.254/latest/meta-data/' },
    ran: 'loadJsonConfig',
  },
  {
    name: 'flow_validate',
    make: (rt) => createFlowValidateToolSpec(rt),
    inline: { type: 'flow', input: INLINE },
    path: { type: 'flow', input: '/etc/passwd' },
    url: { type: 'flow', input: 'http://169.254.169.254/' },
    ran: 'validate',
  },
  {
    name: 'flow_load',
    make: (rt) => createFlowLoadToolSpec(client, rt),
    inline: { source: INLINE },
    path: { source: '/etc/passwd' },
    url: { source: 'http://169.254.169.254/' },
    ran: 'loadJsonConfig',
  },
];

// Tools that BUILD or RUN a flow. The hosted runtime provides none of these.
const execTools: Omit<Row, 'path' | 'url'>[] = [
  {
    name: 'flow_bundle',
    make: (rt) => createFlowBundleToolSpec(client, rt),
    inline: { configPath: INLINE },
    ran: 'bundle',
  },
  {
    name: 'flow_simulate',
    make: (rt) => createFlowSimulateToolSpec(client, rt),
    inline: { configPath: INLINE, step: 'destination.x', event: EVENT },
    ran: 'simulateDestination',
  },
  {
    name: 'flow_push',
    make: (rt) => createFlowPushToolSpec(rt),
    inline: { configPath: INLINE, event: EVENT },
    ran: 'push',
  },
];

// A flow that names an arbitrary registry package carries no `$code:` marker,
// yet bundling would download it and simulate/push would import it. Content
// scanning is not a boundary; the operation itself is absent.
const PACKAGE_VECTOR = JSON.stringify({
  version: 4,
  flows: {
    default: {
      config: { platform: 'server' },
      destinations: { evil: { package: 'attacker-controlled-package' } },
    },
  },
});

describe('read tools under the hosted runtime', () => {
  it.each(readTools)(
    '$name refuses a local file path',
    async ({ make, path, ran }) => {
      expect(isRefusal(await make(hosted).handler(path))).toBe(true);
      expect(mocked[ran]).not.toHaveBeenCalled();
    },
  );

  it.each(readTools)(
    '$name refuses an http URL',
    async ({ make, url, ran }) => {
      expect(isRefusal(await make(hosted).handler(url))).toBe(true);
      expect(mocked[ran]).not.toHaveBeenCalled();
    },
  );

  it.each(readTools)('$name accepts inline JSON', async ({ make, inline }) => {
    expect(isRefusal(await make(hosted).handler(inline))).toBe(false);
  });

  it('flow_validate hands the cli the parsed document, never the raw input', async () => {
    await createFlowValidateToolSpec(hosted).handler({
      type: 'flow',
      input: INLINE,
    });
    expect(mocked.validate).toHaveBeenCalledWith(
      'flow',
      { version: 4, flows: {} },
      expect.anything(),
    );
  });

  it('flow_validate keeps the event-name shorthand hosted, reading nothing', async () => {
    await createFlowValidateToolSpec(hosted).handler({
      type: 'event',
      input: 'page view',
    });
    expect(mocked.validate).toHaveBeenCalledWith(
      'event',
      { name: 'page view' },
      expect.anything(),
    );
    expect(mocked.loadJsonConfig).not.toHaveBeenCalled();
  });

  it('flow_validate surfaces a failed saved-id lookup instead of masking it as a name', async () => {
    const failing = createHostedRuntime(
      stubClient({
        getFlow: async () => {
          throw new Error('Flow not found');
        },
      }),
    );
    const res = await createFlowValidateToolSpec(failing).handler({
      type: 'flow',
      input: 'flow_missing',
    });
    expect((res as { isError?: boolean }).isError).toBe(true);
    expect(JSON.stringify(res)).toMatch(/Flow not found/);
    expect(mocked.validate).not.toHaveBeenCalled();
  });
});

describe('build/run tools under the hosted runtime', () => {
  it.each(execTools)(
    '$name refuses even valid inline JSON',
    async ({ make, inline, ran }) => {
      expect(isRefusal(await make(hosted).handler(inline))).toBe(true);
      expect(mocked[ran]).not.toHaveBeenCalled();
    },
  );

  it.each(execTools)(
    '$name refuses a flow naming an arbitrary package',
    async ({ make, inline, ran }) => {
      const res = await make(hosted).handler({
        ...inline,
        configPath: PACKAGE_VECTOR,
      });
      expect(isRefusal(res)).toBe(true);
      expect(mocked[ran]).not.toHaveBeenCalled();
    },
  );

  it.each(execTools)(
    '$name refuses a saved flow id',
    async ({ make, inline, ran }) => {
      const res = await make(hosted).handler({
        ...inline,
        configPath: 'flow_saved',
      });
      expect(isRefusal(res)).toBe(true);
      expect(mocked[ran]).not.toHaveBeenCalled();
    },
  );

  it.each(execTools)(
    '$name hint names only out-of-process routes',
    async ({ make, inline }) => {
      const text = JSON.stringify(await make(hosted).handler(inline));
      expect(text).not.toMatch(
        /save the flow|by its flow_ id|flow_simulate|flow_push|flow_bundle/i,
      );
      expect(text).toMatch(/deploy_manage/);
    },
  );
});

describe('the local runtime is unchanged', () => {
  it.each(readTools)(
    '$name reaches the cli loader for a local path',
    async ({ make, path, ran }) => {
      await make(local).handler(path);
      expect(mocked[ran]).toHaveBeenCalled();
    },
  );

  it.each(execTools)(
    '$name reaches the cli runner',
    async ({ make, inline, ran }) => {
      await make(local).handler(inline);
      expect(mocked[ran]).toHaveBeenCalled();
    },
  );
});
