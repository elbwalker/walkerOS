import type { SourceBrowser } from '@walkeros/web-source-browser';
import { elbAtApplyFrom } from './controls';

test('looks the elb up at each call, not when made', async () => {
  let running: SourceBrowser.Push | undefined = undefined;
  const elb = elbAtApplyFrom(() => running);

  expect(await elb('walker init', document.body)).toStrictEqual({
    ok: false,
    error: 'walkerOS is not running.',
  });

  const calls: unknown[][] = [];
  running = async (...args: unknown[]) => {
    calls.push(args);
    return { ok: true };
  };
  expect(await elb('walker init', document.body)).toStrictEqual({ ok: true });
  expect(calls).toStrictEqual([['walker init', document.body]]);
});
