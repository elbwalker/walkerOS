import { createCollector } from '@walkerOS/collector';
import { createDestination } from '@walkerOS/core';
import { destinationFirehose } from '@walkerOS/server-destination-aws';
import type { WalkerOS, Collector } from '@walkerOS/core';

export async function setupAWSFirehose(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  // Single big config file - AWS Firehose server destination
  const trackingConfig = {
    run: true,
    globals: {
      environment: 'production',
      service: 'api-server',
    },
    destinations: {
      aws: createDestination(destinationFirehose, {
        settings: {
          firehose: {
            streamName: 'your-firehose-stream',
            region: 'us-east-1',
            config: {
              credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
              },
            },
          },
        },
        mapping: {
          user: {
            signup: {
              name: 'user_registration',
              data: {
                map: {
                  user_id: 'user.id',
                  email: 'user.email',
                  signup_source: 'data.source',
                  plan_type: 'data.plan',
                },
              },
            },
          },
          subscription: {
            purchase: {
              name: 'subscription_created',
              data: {
                map: {
                  user_id: 'user.id',
                  plan: 'data.plan',
                  amount: 'data.amount',
                  currency: 'data.currency',
                  billing_period: 'data.period',
                },
              },
            },
          },
        },
      }),
    },
  };

  const { collector, elb } = await createCollector(trackingConfig);
  return { collector, elb };
}

export async function trackServerEvents(elb: WalkerOS.Elb): Promise<void> {
  await elb({
    event: 'user signup',
    user: {
      id: 'user-123',
      email: 'user@example.com',
    },
    data: {
      plan: 'premium',
      source: 'organic',
    },
  });

  await elb({
    event: 'subscription purchase',
    user: {
      id: 'user-123',
    },
    data: {
      plan: 'premium',
      amount: 99.99,
      currency: 'USD',
      period: 'monthly',
    },
  });
}
