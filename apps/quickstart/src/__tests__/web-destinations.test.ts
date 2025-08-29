import {
  setupGoogleAds,
  trackAdsConversions,
} from '../web-destinations/gtag-ads';
import {
  setupMetaPixel,
  trackMetaEvents,
} from '../web-destinations/meta-pixel';
import { setupAPIDestination } from '../web-destinations/api';

describe('Web Destination Examples', () => {
  describe('Google Ads', () => {
    it('creates collector for Google Ads', async () => {
      const { collector, elb } = await setupGoogleAds();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('tracks conversions without errors', async () => {
      const { collector, elb } = await setupGoogleAds();
      await expect(trackAdsConversions(elb)).resolves.not.toThrow();
    });
  });

  describe('Meta Pixel', () => {
    it('creates collector for Meta Pixel', async () => {
      const { collector, elb } = await setupMetaPixel();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('tracks Meta events without errors', async () => {
      const { collector, elb } = await setupMetaPixel();
      await expect(trackMetaEvents(elb)).resolves.not.toThrow();
    });
  });

  describe('API Destination', () => {
    it('creates basic API collector', async () => {
      const { collector, elb } = await setupAPIDestination();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });
  });
});
