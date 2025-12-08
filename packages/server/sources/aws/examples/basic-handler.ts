/**
 * Basic Lambda Handler Example
 *
 * This demonstrates the recommended singleton pattern for Lambda functions
 * to maximize warm start performance.
 */

import { sourceLambda, type SourceLambda } from '@walkeros/server-source-aws';
import { startFlow } from '@walkeros/collector';

// Handler singleton - reused across warm invocations
let handler: SourceLambda.Push;

/**
 * Initialize the Lambda source and collector
 * Only runs once per Lambda container lifecycle
 */
async function setup() {
  if (handler) return handler;

  const { elb } = await startFlow<SourceLambda.Push>({
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

  handler = elb;
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
