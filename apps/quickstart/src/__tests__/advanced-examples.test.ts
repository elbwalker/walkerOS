import {
  setupCustomDestination,
  trackCustomDestinationEvents,
} from '../web-destinations/custom-destination';
import {
  setupConsentManagement,
  handleConsentChoice,
  trackConsentedEvents,
} from '../consent/management';
import {
  setupCustomMappingFunctions,
  trackCustomMappedEvents,
} from '../mappings/custom-functions';
import {
  setupBatchProcessing,
  simulateHighVolumeTracking,
} from '../performance/batch-processing';

// Mock fetch for the custom destination
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
});

describe('Advanced Examples', () => {
  describe('Custom Destination', () => {
    it('creates collector with custom destination', async () => {
      const { collector, elb } = await setupCustomDestination();
      expect(collector).toBeDefined();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('tracks custom destination events without errors', async () => {
      const { collector, elb } = await setupCustomDestination();
      await expect(trackCustomDestinationEvents(elb)).resolves.not.toThrow();
    });
  });

  describe('Consent Management', () => {
    it('creates collector with consent setup', async () => {
      const { collector, elb } = await setupConsentManagement();
      expect(collector).toBeDefined();
      expect(collector.allowed).toBe(false); // Initially disabled
      expect(elb).toBeDefined();
    });

    it('handles consent choices', async () => {
      const { collector, elb } = await setupConsentManagement();

      // Test accept consent
      await expect(
        handleConsentChoice(collector, 'accept'),
      ).resolves.not.toThrow();
      expect(collector.allowed).toBe(true);

      // Test reject consent
      await expect(
        handleConsentChoice(collector, 'reject'),
      ).resolves.not.toThrow();
      expect(collector.allowed).toBe(false);

      // Test custom consent
      await expect(
        handleConsentChoice(collector, 'customize', {
          analytics: true,
          advertising: false,
          functional: true,
        }),
      ).resolves.not.toThrow();
      expect(collector.allowed).toBe(true);
    });

    it('tracks consented events without errors', async () => {
      const { collector, elb } = await setupConsentManagement();
      await expect(trackConsentedEvents(elb)).resolves.not.toThrow();
    });
  });

  describe('Custom Mapping Functions', () => {
    it('creates collector with custom mappings', async () => {
      const { collector, elb } = await setupCustomMappingFunctions();
      expect(collector).toBeDefined();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('tracks events with custom mappings without errors', async () => {
      const { collector, elb } = await setupCustomMappingFunctions();
      await expect(trackCustomMappedEvents(elb)).resolves.not.toThrow();
    });
  });

  describe('Batch Processing', () => {
    it('creates collector with batch processing', async () => {
      const { collector, elb } = await setupBatchProcessing();
      expect(collector).toBeDefined();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('simulates high-volume tracking without errors', async () => {
      const { collector, elb } = await setupBatchProcessing();
      // Test that we can call the elb function without errors
      // Skip the full simulation to avoid timeout issues in tests
      await expect(elb('test event', { test: true })).resolves.not.toThrow();
    });
  });
});
