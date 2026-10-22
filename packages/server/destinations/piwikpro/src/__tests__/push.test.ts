import type {
  Collector,
  SendResponse,
  StandardEventName,
  WalkerOS,
} from '@walkeros/core';
import type { PartialConfig } from '../types';
import { createEvent, createIngest, getEvent, StepError } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { destinationPiwikPro } from '..';

const ENDPOINT = 'https://acc.piwik.pro/ppms.php';
const SOURCE = { type: 'collector', url: 'https://www.example.com/docs/' };

describe('push', () => {
  const sendServer = jest.fn<Promise<SendResponse>, unknown[]>();
  let collector: Collector.Instance;

  beforeEach(() => {
    sendServer.mockReset();
    sendServer.mockResolvedValue({ data: '' });
  });

  async function setup(config: PartialConfig = {}) {
    ({ collector } = await startFlow({
      destinations: {
        piwik: {
          code: { ...destinationPiwikPro, env: { sendServer } },
          config: {
            ...config,
            settings: { url: 'https://acc.piwik.pro', appId: 'site-1' },
          },
        },
      },
    }));
    return collector;
  }

  function event(
    name: StandardEventName,
    props: WalkerOS.DeepPartialEvent = {},
  ) {
    return getEvent(name, {
      timestamp: 1700000300000,
      source: SOURCE,
      ...props,
    });
  }

  /** Awaits the batch flushes the size cap started. */
  async function settle() {
    const batches = collector.destinations.piwik.batches ?? {};
    await Promise.all(Object.values(batches).map((batch) => batch.flush()));
  }

  /** The request strings of every sendServer call. */
  function requests(): string[][] {
    return sendServer.mock.calls.map(([, body]) => {
      const parsed: unknown = JSON.parse(String(body));
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('requests' in parsed) ||
        !Array.isArray(parsed.requests)
      )
        throw new Error('unexpected body');
      return parsed.requests.map(String);
    });
  }

  it('posts a page view to ppms.php as a bulk body', async () => {
    await setup();
    await collector.push(event('page view'));

    expect(sendServer).toHaveBeenCalledWith(ENDPOINT, expect.any(String), {
      timeout: 5000,
    });
    const [[request]] = requests();
    expect(request.startsWith('?idsite=site-1&')).toBe(true);
    expect(request).toContain('&rec=1&');
  });

  it('normalizes the url when init is skipped', async () => {
    await setup({ init: true });
    await collector.push(event('page view'));
    expect(sendServer).toHaveBeenCalledWith(
      ENDPOINT,
      expect.any(String),
      expect.any(Object),
    );
  });

  it('form-encodes a space and an umlaut', async () => {
    await setup();
    await collector.push(
      event('page view', { data: { title: 'Müller Shop' } }),
    );
    expect(requests()[0][0]).toContain('&action_name=M%C3%BCller+Shop&');
  });

  it('sends one request per batch, with goal hits and per-entry ingest, and fails the unmapped one', async () => {
    await setup({
      batch: { size: 3, wait: 60000 },
      mapping: {
        promotion: {
          visible: {
            name: 'trackEvent',
            settings: { goalId: 'g1' },
            data: { set: ['entity', 'action'] },
          },
        },
      },
    });

    const ingest = (ip: string) => ({ ...createIngest('test'), ip });
    await collector.push(event('page view'), { ingest: ingest('203.0.113.1') });
    await collector.push(event('promotion visible'), {
      ingest: ingest('203.0.113.2'),
    });
    await collector.push(event('product view'), {
      ingest: ingest('203.0.113.3'),
    });
    await settle();

    const sent = requests();
    expect(sent).toHaveLength(1);
    const [page, promotion, goal] = sent[0].map(
      (request) => new URLSearchParams(request),
    );
    expect(sent[0]).toHaveLength(3);
    expect(page.get('action_name')).toBe('walkerOS documentation');
    expect(page.get('cip')).toBe('203.0.113.1');
    expect(promotion.get('e_c')).toBe('promotion');
    expect(promotion.get('cip')).toBe('203.0.113.2');
    expect(goal.get('idgoal')).toBe('g1');
  });

  it('sends nothing for a batch of unmapped entries', async () => {
    await setup({ batch: { size: 2, wait: 60000 } });
    await collector.push(event('product view'));
    await collector.push(event('product add'));
    await settle();
    expect(sendServer).not.toHaveBeenCalled();
    expect(collector.status.destinations.piwik.failed).toBe(2);
  });

  it('fails a push on a transport error', async () => {
    await setup();
    sendServer.mockRejectedValue(
      new StepError('HTTP 500', { code: 'transport', status: 500 }),
    );
    const failed = collector.status.failed;
    await collector.push(event('page view'));
    expect(collector.status.failed).toBe(failed + 1);
  });

  it('fails the whole batch on a transport error', async () => {
    await setup({ batch: { size: 2, wait: 60000 } });
    sendServer.mockRejectedValue(
      new StepError('HTTP 500', { code: 'transport', status: 500 }),
    );
    const failed = collector.status.failed;
    await collector.push(event('page view'));
    await collector.push(event('page view'));
    await settle();
    expect(collector.status.failed).toBe(failed + 2);
  });

  it('reports a 429 as a retryable failure with its status', async () => {
    await setup();
    sendServer.mockRejectedValue(
      new StepError('HTTP 429', { code: 'transport', status: 429 }),
    );
    const result = await collector.push(event('page view'));
    expect(result.failed?.piwik?.reason).toMatchObject({
      code: 'transport',
      status: 429,
      retryable: true,
    });
  });

  it('fails an event the rule cannot send, with missing-input', async () => {
    await setup();
    const result = await collector.push(
      event('page view', { source: { type: 'collector' } }),
    );
    expect(result.failed?.piwik?.reason).toMatchObject({
      code: 'missing-input',
      retryable: false,
    });
    expect(sendServer).not.toHaveBeenCalled();
  });

  it('fails only the unsendable entry of a batch', async () => {
    await setup({ batch: { size: 2, wait: 60000 } });
    await collector.push(event('page view'));
    await collector.push(event('page view', { source: { type: 'collector' } }));
    await settle();
    expect(requests()[0]).toHaveLength(1);
    expect(collector.status.destinations.piwik.count).toBe(1);
    expect(collector.status.destinations.piwik.failed).toBe(1);
  });

  it('fails an unmapped event with missing-input', async () => {
    await setup();
    const result = await collector.push(
      createEvent({
        name: 'skip probe',
        timestamp: 1700000300000,
        source: SOURCE,
      }),
    );
    expect(result.failed?.piwik?.reason).toMatchObject({
      code: 'missing-input',
      retryable: false,
    });
    expect(sendServer).not.toHaveBeenCalled();
  });
});
