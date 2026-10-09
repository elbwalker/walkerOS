/**
 * Basic Lambda Handler Example
 *
 * This demonstrates the recommended singleton pattern for Lambda functions
 * to maximize warm start performance.
 */

import { Source } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceLambda, type SourceLambda } from '@walkeros/server-source-aws';

// Handler singleton - reused across warm invocations
let handler: SourceLambda.Push | undefined;

/**
 * Initialize the Lambda source and collector
 * Only runs once per Lambda container lifecycle
 */
async function setup(): Promise<SourceLambda.Push> {
  if (handler) return handler;

  const { collector } = await startFlow({
    sources: {
      lambda: {
        code: sourceLambda,
        config: {
          settings: {
            cors: true,
            enablePixelTracking: true,
            healthPath: '/health',
          },
        },
      },
    },
    destinations: {
      // Add your destinations here
      // Example: AWS Kinesis, S3, CloudWatch, etc.
    },
  });

  handler = Source.getSource<SourceLambda.Types>(collector, 'lambda').push;
  return handler;
}

/**
 * Lambda handler entry point
 * AWS invokes this function for each request
 */
export const main: SourceLambda.Push = async (event, context) => {
  const h = await setup();
  return h(event, context);
};

// Export for Lambda runtime
export { main as handler };
