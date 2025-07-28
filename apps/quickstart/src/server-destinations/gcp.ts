import { createCollector } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';

export async function setupGCPPubSub(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector();
  return { collector, elb };
}

export const gcpPubSubConfig = {
  settings: {
    projectId: 'your-gcp-project',
    topicName: 'walkerOS-events',
    credentials: {
      client_email: process.env.GCP_CLIENT_EMAIL || '',
      private_key: process.env.GCP_PRIVATE_KEY || '',
    },
  },
};

export async function publishToGCP(elb: WalkerOS.Elb): Promise<void> {
  await elb('api request', {
    endpoint: '/api/v1/users',
    method: 'POST',
  });

  await elb('job complete', {
    jobId: 'job-789',
    type: 'data-processing',
  });
}
