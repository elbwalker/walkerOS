/**
 * Basic Lambda Handler Example
 *
 * This demonstrates the recommended singleton pattern for Lambda functions
 * to maximize warm start performance.
 */

import { sourceLambda } from '@walkeros/server-source-aws';
import { startFlow } from '@walkeros/collector';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

// Handler singleton - reused across warm invocations
let handler:
  | ((
      event: APIGatewayProxyEvent,
      context: Context,
    ) => Promise<APIGatewayProxyResult>)
  | null = null;

/**
 * Initialize the Lambda source and collector
 * Only runs once per Lambda container lifecycle
 */
async function initialize() {
  if (handler) return handler;

  const { sources } = await startFlow({
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

  handler = sources.lambda.push;
  return handler;
}

/**
 * Lambda handler entry point
 * AWS invokes this function for each request
 */
export const main = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  const h = await initialize();
  return h(event, context);
};

// Export for Lambda runtime
export { main as handler };
