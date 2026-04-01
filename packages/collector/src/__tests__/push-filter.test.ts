import { startFlow } from '..';

describe('push destination filter', () => {
  it('include limits which destinations receive the event', async () => {
    const pushA = jest.fn();
    const pushB = jest.fn();

    const { collector } = await startFlow({
      destinations: {
        a: { code: { type: 'test', config: {}, push: pushA } },
        b: { code: { type: 'test', config: {}, push: pushB } },
      },
    });

    await collector.push(
      { name: 'foo bar', data: { x: 1 } },
      { include: ['a'] },
    );

    expect(pushA).toHaveBeenCalled();
    expect(pushB).not.toHaveBeenCalled();
  });

  it('exclude removes destinations from the set', async () => {
    const pushA = jest.fn();
    const pushB = jest.fn();
    const pushC = jest.fn();

    const { collector } = await startFlow({
      destinations: {
        a: { code: { type: 'test', config: {}, push: pushA } },
        b: { code: { type: 'test', config: {}, push: pushB } },
        c: { code: { type: 'test', config: {}, push: pushC } },
      },
    });

    await collector.push(
      { name: 'foo bar', data: { x: 1 } },
      { exclude: ['b'] },
    );

    expect(pushA).toHaveBeenCalled();
    expect(pushB).not.toHaveBeenCalled();
    expect(pushC).toHaveBeenCalled();
  });

  it('include and exclude work together', async () => {
    const pushA = jest.fn();
    const pushB = jest.fn();
    const pushC = jest.fn();

    const { collector } = await startFlow({
      destinations: {
        a: { code: { type: 'test', config: {}, push: pushA } },
        b: { code: { type: 'test', config: {}, push: pushB } },
        c: { code: { type: 'test', config: {}, push: pushC } },
      },
    });

    await collector.push(
      { name: 'foo bar', data: { x: 1 } },
      { include: ['a', 'b'], exclude: ['b'] },
    );

    expect(pushA).toHaveBeenCalled();
    expect(pushB).not.toHaveBeenCalled();
    expect(pushC).not.toHaveBeenCalled();
  });

  it('no filter pushes to all destinations', async () => {
    const pushA = jest.fn();
    const pushB = jest.fn();

    const { collector } = await startFlow({
      destinations: {
        a: { code: { type: 'test', config: {}, push: pushA } },
        b: { code: { type: 'test', config: {}, push: pushB } },
      },
    });

    await collector.push({ name: 'foo bar', data: { x: 1 } });

    expect(pushA).toHaveBeenCalled();
    expect(pushB).toHaveBeenCalled();
  });
});
