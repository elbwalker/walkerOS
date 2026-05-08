/**
 * Example environment metadata for AWS SNS destination.
 *
 * Tests substitute the real SDK via `jest.mock('@aws-sdk/client-sns')` and
 * `jest.mock('@aws-sdk/client-sts')`. The `simulation` array documents which
 * globals the destination touches during a simulated run, so the simulator
 * knows what to stub. This file ships ZERO casts.
 */

export const simulation = ['AWS.SNSClient', 'AWS.STSClient'];
