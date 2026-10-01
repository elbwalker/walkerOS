jest.unmock('@aws-sdk/client-sns');

import {
  ResourceNotFoundException,
  ServiceUnavailableException,
} from '@aws-sdk/client-firehose';
import { NotFoundException, ThrottledException } from '@aws-sdk/client-sns';
import { CredentialsProviderError } from '@smithy/core/config';
import type { DeliveryTarget } from '../errors';
import {
  AwsDeliveryError,
  configError,
  fromSdkError,
  localError,
  recordError,
} from '../errors';

const firehose: DeliveryTarget = {
  service: 'Firehose',
  resource: 'walkeros-events',
  region: 'eu-west-1',
};
const sns: DeliveryTarget = {
  service: 'SNS',
  resource: 'arn:aws:sns:eu-west-1:111111111111:events',
  region: 'eu-west-1',
  id: 'topic',
};

const metadata = (httpStatusCode: number) => ({ httpStatusCode, attempts: 1 });

function namedError(name: string, extra: Record<string, unknown> = {}): Error {
  return Object.assign(new Error(`${name} happened`), { name }, extra);
}

describe('fromSdkError', () => {
  it.each([
    [
      'ThrottledException',
      new ThrottledException({
        message: 'slow down',
        $metadata: metadata(400),
      }),
      { code: 'ThrottledException', status: 400, retryable: true },
    ],
    [
      'a 429',
      namedError('TooManyRequests', { $metadata: metadata(429) }),
      { code: 'TooManyRequests', status: 429, retryable: true },
    ],
    [
      'a 500 ServiceUnavailableException',
      new ServiceUnavailableException({
        message: 'busy',
        $metadata: metadata(500),
      }),
      { code: 'ServiceUnavailableException', status: 500, retryable: true },
    ],
    [
      'a TimeoutError',
      namedError('TimeoutError'),
      { code: 'TimeoutError', status: undefined, retryable: true },
    ],
    [
      'ECONNRESET',
      namedError('Error', { code: 'ECONNRESET' }),
      { code: 'ECONNRESET', status: undefined, retryable: true },
    ],
    [
      'a 400 ResourceNotFoundException',
      new ResourceNotFoundException({
        message: 'Stream walkeros-events not found',
        $metadata: metadata(400),
      }),
      { code: 'ResourceNotFoundException', status: 400, retryable: false },
    ],
    [
      'CredentialsProviderError',
      new CredentialsProviderError(
        'Could not load credentials from any providers',
      ),
      { code: 'CredentialsProviderError', status: undefined, retryable: false },
    ],
  ])('classifies %s with the SDK classifier', (_name, sdkError, expected) => {
    const error = fromSdkError(sdkError, firehose);

    expect(error).toBeInstanceOf(AwsDeliveryError);
    expect({
      code: error.code,
      status: error.status,
      retryable: error.retryable,
    }).toEqual(expected);
    expect(error.cause).toBe(sdkError);
    expect(error.message).toContain('walkeros-events');
    expect(error.message).toContain('eu-west-1');
    expect(error.message).toContain(expected.code);
    expect(error).not.toHaveProperty('maybeDelivered');
  });

  it.each([
    ['ResourceNotFoundException', firehose, 'settings.streamName'],
    ['ResourceNotFoundException', sns, 'settings.topicArn'],
    ['AccessDeniedException', firehose, 'firehose:PutRecordBatch'],
    ['AuthorizationErrorException', sns, 'sns:Publish'],
    ['UnrecognizedClientException', firehose, 'config.credentials'],
    ['InvalidSignatureException', firehose, 'config.credentials'],
    ['ExpiredTokenException', sns, 'config.credentials'],
    ['CredentialsProviderError', firehose, 'config.credentials'],
    ['NotFoundException', sns, 'walkeros setup destination.topic'],
  ])('adds a fix for %s', (name, target, fragment) => {
    expect(fromSdkError(namedError(name), target).message).toContain(fragment);
  });

  it.each([
    ['ValidationException', firehose],
    ['NotFoundException', firehose],
    ['InternalError', sns],
  ])('passes %s through without a fix', (name, target) => {
    const error = fromSdkError(namedError(name), target);
    expect(error.message).toBe(
      `${target.service} ${target.service === 'SNS' ? 'topic' : 'stream'} "${target.resource}" (${target.region}): ${name}: ${name} happened`,
    );
  });

  it('keeps an SNS NotFoundException as its cause', () => {
    const sdkError = new NotFoundException({
      message: 'Topic does not exist',
      $metadata: metadata(404),
    });
    const error = fromSdkError(sdkError, sns);
    expect(error).toMatchObject({ code: 'NotFoundException', status: 404 });
    expect(error.cause).toBe(sdkError);
  });

  it('returns an AwsDeliveryError unchanged', () => {
    const error = configError('bad');
    expect(fromSdkError(error, firehose)).toBe(error);
  });
});

describe('package errors', () => {
  it('marks a record rejected inside a 200 as retryable', () => {
    const error = recordError(
      firehose,
      'ServiceUnavailableException',
      'Slow down.',
      200,
    );
    expect(error).toMatchObject({
      code: 'ServiceUnavailableException',
      status: 200,
      retryable: true,
    });
  });

  it.each([
    ['InvalidResponse', true],
    ['RecordTooLarge', false],
    ['InvalidRecord', false],
  ] as const)('%s is retryable: %s', (code, retryable) => {
    const error = localError(firehose, code, 'detail');
    expect(error).toMatchObject({ code, retryable });
    expect(error.message).toContain('walkeros-events');
  });

  it('configuration errors are not retryable', () => {
    expect(configError('fix it')).toMatchObject({
      code: 'InvalidConfig',
      retryable: false,
      message: 'fix it',
    });
  });
});
