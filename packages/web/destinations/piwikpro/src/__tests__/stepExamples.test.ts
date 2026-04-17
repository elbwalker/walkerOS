import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const env = clone(examples.env.push);
    // PiwikPro captures _paq.push unbound, so use a plain object
    // whose push method doesn't need `this` context
    const paqCommands: unknown[] = [];
    env.window._paq = {
      push: (...args: unknown[]) => {
        for (const arg of args) paqCommands.push(arg);
        return paqCommands.length;
      },
    } as unknown as typeof env.window._paq;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: { appId: 'test-app', url: 'https://test.piwik.pro/' },
        mapping: mappingConfig,
      },
    );
    await elb(event);

    const expected = (example.out ?? []) as readonly (readonly unknown[])[];
    const actual = paqCommands.slice(-expected.length);
    expect(actual).toEqual(expected);
  });
});
