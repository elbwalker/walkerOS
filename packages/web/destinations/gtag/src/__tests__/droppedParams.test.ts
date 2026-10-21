import type { Logger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone, getEvent, Level } from '@walkeros/core';
import { destinationGtag } from '..';
import { examples } from '../dev';

describe('GA4 parameter names the mapping cannot carry', () => {
  it('sends the event without the parameter and writes one ERROR line per cause', async () => {
    const levels: Logger.Level[] = [];
    const gtag = jest.fn();
    const env = clone(examples.env.push);
    env.window.gtag = gtag;
    const { elb } = await startFlow({
      // The default level: only ERROR lines reach the handler.
      logger: { handler: (level) => levels.push(level) },
      destinations: {
        gtag: {
          code: { ...destinationGtag, env },
          config: {
            settings: { ga4: { measurementId: 'G-DROPPED' } },
            mapping: {
              product: {
                view: {
                  data: { map: { 'a-b': 'data.id', 'a.b': 'data.name' } },
                },
              },
            },
          },
        },
      },
    });

    const first = await elb(getEvent('product view'));
    const second = await elb(getEvent('product view'));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    const sent = gtag.mock.calls.filter(([command]) => command === 'event');
    expect(sent).toHaveLength(2);
    expect(sent[0][2]).toEqual({ a_b: 'ers', send_to: 'G-DROPPED' });
    // The second occurrence within the window is counted, not logged.
    expect(levels.filter((level) => level === Level.ERROR)).toHaveLength(1);
  });
});
