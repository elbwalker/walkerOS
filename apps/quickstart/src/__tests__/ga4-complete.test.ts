import {
  setupGA4Complete,
  trackGA4Events,
} from '../web-destinations/ga4-complete';

describe('GA4 Complete Example', () => {
  it('creates collector instance', async () => {
    const { collector, elb } = await setupGA4Complete();
    expect(collector.push).toBeDefined();
    expect(elb).toBeDefined();
  });

  it('tracks all GA4 events without errors', async () => {
    const { elb } = await setupGA4Complete();
    await expect(trackGA4Events(elb)).resolves.not.toThrow();
  });
});
