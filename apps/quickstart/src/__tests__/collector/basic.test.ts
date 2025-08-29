import {
  setupCollector,
  setupCollectorWithConfig,
  trackPageView,
  trackUserAction,
} from '../../collector/basic';

describe('Collector Basic Examples', () => {
  it('creates basic collector', async () => {
    const { collector, elb } = await setupCollector();
    expect(collector.push).toBeDefined();
    expect(elb).toBeDefined();
  });

  it('creates collector with console destination', async () => {
    const { collector, elb } = await setupCollectorWithConfig();
    expect(collector.destinations.console).toBeDefined();
    expect(elb).toBeDefined();
  });

  it('tracks events without errors', async () => {
    const { collector, elb } = await setupCollector();
    await expect(trackPageView(elb)).resolves.not.toThrow();
    await expect(trackUserAction(elb)).resolves.not.toThrow();
  });
});
