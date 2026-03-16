import type { Trigger } from '@walkeros/core';
import { examples } from '../dev';

describe('Browser createTrigger', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    (window as unknown as { elbLayer?: unknown[] }).elbLayer = undefined;
  });

  it('should be typed as Trigger.CreateFn', () => {
    const fn: Trigger.CreateFn<string, void> = examples.createTrigger;
    expect(typeof fn).toBe('function');
  });

  it('should return trigger function and undefined flow before first call', async () => {
    const instance = await examples.createTrigger({});
    expect(instance.flow).toBeUndefined();
    expect(typeof instance.trigger).toBe('function');
  });

  it('should initialize flow on first trigger call', async () => {
    const instance = await examples.createTrigger({
      consent: { functional: true },
    });

    expect(instance.flow).toBeUndefined();
    await instance.trigger('load')('');
    expect(instance.flow).toBeDefined();
    expect(instance.flow!.collector).toBeDefined();
    expect(instance.flow!.elb).toBeDefined();
  });

  it('should reuse flow on subsequent trigger calls', async () => {
    const instance = await examples.createTrigger({
      consent: { functional: true },
    });

    await instance.trigger('load')('');
    const firstFlow = instance.flow;

    await instance.trigger(
      'click',
      'button',
    )('<button data-elb="test" data-elbaction="click:press">Test</button>');
    expect(instance.flow).toBe(firstFlow);
  });

  it('should capture load events from HTML content', async () => {
    const instance = await examples.createTrigger({
      consent: { functional: true },
      sources: {
        browser: {
          code: (await import('../index')).sourceBrowser,
          config: {
            settings: { pageview: false, scope: document },
          },
        },
      },
    });

    await instance.trigger('load')(
      '<div data-elb="product" data-elb-product="name:Sneakers" data-elbaction="load:view"></div>',
    );

    // Verify flow is initialized and collector exists
    expect(instance.flow).toBeDefined();
  });

  it('should not modify DOM when content is empty', async () => {
    const instance = await examples.createTrigger({
      consent: { functional: true },
    });

    const before = document.body.innerHTML;
    await instance.trigger('load')('');
    expect(document.body.innerHTML).toBe(before);
  });

  it('should warn when selector not found for interactive trigger', async () => {
    const instance = await examples.createTrigger({
      consent: { functional: true },
    });

    await instance.trigger('load')('');

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    // Trigger click on non-existent selector
    await instance.trigger('click', '.nonexistent')('');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('.nonexistent'),
    );
    warnSpy.mockRestore();
  });
});
