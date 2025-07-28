import {
  setupAWSFirehose,
  trackServerEvents,
} from '../server-destinations/aws';
import { setupGCPPubSub, publishToGCP } from '../server-destinations/gcp';
import {
  setupMetaCAPI,
  trackServerConversions,
} from '../server-destinations/meta-capi';

describe('Server Destination Examples', () => {
  describe('AWS Firehose', () => {
    it('creates collector for AWS', async () => {
      const { collector, elb } = await setupAWSFirehose();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('tracks server events without errors', async () => {
      const { collector, elb } = await setupAWSFirehose();
      await expect(trackServerEvents(elb)).resolves.not.toThrow();
    });
  });

  describe('GCP Pub/Sub', () => {
    it('creates collector for GCP', async () => {
      const { collector, elb } = await setupGCPPubSub();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('publishes to GCP without errors', async () => {
      const { collector, elb } = await setupGCPPubSub();
      await expect(publishToGCP(elb)).resolves.not.toThrow();
    });
  });

  describe('Meta CAPI', () => {
    it('creates collector for Meta CAPI', async () => {
      const { collector, elb } = await setupMetaCAPI();
      expect(collector.push).toBeDefined();
      expect(elb).toBeDefined();
    });

    it('tracks server conversions without errors', async () => {
      const { collector, elb } = await setupMetaCAPI();
      await expect(trackServerConversions(elb)).resolves.not.toThrow();
    });
  });
});
