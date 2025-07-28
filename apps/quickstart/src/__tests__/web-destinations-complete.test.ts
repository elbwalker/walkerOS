import {
  setupGtagComplete,
  trackGtagEvents,
} from '../web-destinations/gtag-complete';
import {
  setupPiwikPro,
  trackPiwikProEvents,
} from '../web-destinations/piwikpro';
import {
  setupPlausible,
  trackPlausibleEvents,
} from '../web-destinations/plausible';
import { setupAPIDestination, trackAPIEvents } from '../web-destinations/api';

describe('Complete Web Destination Examples', () => {
  describe('Gtag Complete', () => {
    it('creates collector instance', async () => {
      const { collector, elb } = await setupGtagComplete();
      expect(collector).toBeDefined();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('tracks gtag events without errors', async () => {
      const { collector, elb } = await setupGtagComplete();
      await expect(trackGtagEvents(elb)).resolves.not.toThrow();
    });
  });

  describe('PiwikPro', () => {
    it('creates collector instance', async () => {
      const { collector, elb } = await setupPiwikPro();
      expect(collector).toBeDefined();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('tracks PiwikPro events without errors', async () => {
      const { collector, elb } = await setupPiwikPro();
      await expect(trackPiwikProEvents(elb)).resolves.not.toThrow();
    });
  });

  describe('Plausible', () => {
    it('creates collector instance', async () => {
      const { collector, elb } = await setupPlausible();
      expect(collector).toBeDefined();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('tracks Plausible events without errors', async () => {
      const { collector, elb } = await setupPlausible();
      await expect(trackPlausibleEvents(elb)).resolves.not.toThrow();
    });
  });

  describe('API with Mapping', () => {
    it('creates collector instance', async () => {
      const { collector, elb } = await setupAPIDestination();
      expect(collector).toBeDefined();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('tracks API events without errors', async () => {
      const { collector, elb } = await setupAPIDestination();
      await expect(trackAPIEvents(elb)).resolves.not.toThrow();
    });
  });
});
