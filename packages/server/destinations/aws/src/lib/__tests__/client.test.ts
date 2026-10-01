import {
  InFlight,
  firstString,
  parseTopicArn,
  requestHandlerOptions,
  resolveTimeout,
} from '../client';

describe('requestHandlerOptions', () => {
  it.each([
    [undefined, 2500],
    [10_000, 2500],
    [4000, 1000],
    [0, 2500],
    [-1, 2500],
    [Number.POSITIVE_INFINITY, 2500],
  ])('timeout %p gives a %p ms attempt', (timeout, requestTimeout) => {
    expect(requestHandlerOptions(timeout)).toEqual({
      requestTimeout,
      throwOnRequestTimeout: true,
    });
  });

  it('defaults the race to 10 s', () => {
    expect(resolveTimeout()).toBe(10_000);
  });
});

describe('parseTopicArn', () => {
  it.each([
    [
      'arn:aws:sns:us-east-1:111111111111:events',
      { region: 'us-east-1', accountId: '111111111111', name: 'events' },
    ],
    [
      'arn:aws-cn:sns:cn-north-1:222222222222:orders.fifo',
      { region: 'cn-north-1', accountId: '222222222222', name: 'orders.fifo' },
    ],
    ['arn:aws:sqs:us-east-1:111111111111:queue', undefined],
    ['events', undefined],
    ['arn:aws:sns::111111111111:events', undefined],
  ])('%s', (arn, expected) => {
    expect(parseTopicArn(arn)).toEqual(expected);
  });
});

describe('firstString', () => {
  it('skips undefined and empty strings', () => {
    expect(firstString(undefined, '', 'eu-west-1', 'us-east-1')).toBe(
      'eu-west-1',
    );
    expect(firstString(undefined, '')).toBeUndefined();
  });
});

describe('InFlight', () => {
  it('settle waits for tracked sends and survives rejections', async () => {
    const inflight = new InFlight();
    const order: string[] = [];

    const ok = inflight.track(
      new Promise<void>((resolve) =>
        setTimeout(() => {
          order.push('ok');
          resolve();
        }, 10),
      ),
    );
    const failed = inflight.track(
      new Promise<void>((_, reject) =>
        setTimeout(() => {
          order.push('failed');
          reject(new Error('boom'));
        }, 5),
      ),
    );
    failed.catch(() => undefined);

    expect(inflight.size).toBe(2);
    await inflight.settle();
    order.push('settled');

    expect(order).toEqual(['failed', 'ok', 'settled']);
    expect(inflight.size).toBe(0);
    await expect(ok).resolves.toBeUndefined();
  });

  it('settle resolves at once with nothing in flight', async () => {
    await expect(new InFlight().settle()).resolves.toBeUndefined();
  });
});
