import { createElb } from '../elb';
import { startFlow } from '../flow';
import { createPushResult } from '../destination';

describe('createElb adapter', () => {
  it('forwards a clone of the caller object, not the caller reference', async () => {
    const { collector } = await startFlow({});
    const elb = createElb(collector);

    // Capture the exact object the adapter hands to collector.push.
    let pushed: unknown;
    const pushSpy = jest
      .spyOn(collector, 'push')
      .mockImplementation(async (event) => {
        pushed = event;
        return createPushResult({ ok: true });
      });

    const event = { name: 'page view' };
    await elb(event);

    expect(pushSpy).toHaveBeenCalledTimes(1);
    // A distinct reference (shallow clone) means downstream writes can never
    // leak back onto the caller's object across reused calls.
    expect(pushed).not.toBe(event);
    expect(pushed).toEqual(event);
  });
});
