import {
  setupBrowserTracking,
  setupBrowserWithConsole,
} from '../web-browser/basic';
import { setupDataLayer } from '../web-dataLayer/basic';

describe('Web Source Examples', () => {
  describe('Browser Source', () => {
    it('creates collector', async () => {
      const { collector, elb } = await setupBrowserTracking();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('creates collector with console', async () => {
      const { collector, elb } = await setupBrowserWithConsole();
      expect(collector.destinations.console).toBeDefined();
      expect(elb).toBeDefined();
    });
  });

  describe('DataLayer Source', () => {
    it('creates collector', async () => {
      const { collector, elb } = await setupDataLayer();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });
  });
});
