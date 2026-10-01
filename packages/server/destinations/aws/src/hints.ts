import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'minimal-config': {
    text: 'Firehose needs settings.streamName (plus settings.region when the stream is not in AWS_REGION or eu-central-1). SNS needs settings.topicArn; region and topic name derive from it. Off AWS, add config.credentials. Nothing is sent and no credentials are loaded until the first event.',
    code: [
      {
        lang: 'json',
        code: '{ "settings": { "streamName": "walkeros-events", "region": "eu-central-1" }, "credentials": { "accessKeyId": "$secret.AWS_ACCESS_KEY_ID", "secretAccessKey": "$secret.AWS_SECRET_ACCESS_KEY" } }',
      },
      {
        lang: 'json',
        code: '{ "settings": { "topicArn": "arn:aws:sns:eu-central-1:123456789012:walkeros-events" } }',
      },
    ],
  },
  'auth-credentials': {
    text: 'On AWS compute an attached IAM role needs no config at all. Elsewhere, config.credentials ({ accessKeyId, secretAccessKey, sessionToken? }, or the same as a JSON string) wins over settings.config.credentials, which wins over the AWS default chain (AWS_* variables, AWS_PROFILE, ECS, EC2 and web identity roles; Kubernetes can go keyless with AWS_ROLE_ARN plus AWS_WEB_IDENTITY_TOKEN_FILE). Back every value with $secret; never write a literal key. Credentials are shape-checked at init and loaded only at the first send.',
    code: [
      {
        lang: 'json',
        code: '{ "credentials": { "accessKeyId": "$secret.AWS_ACCESS_KEY_ID", "secretAccessKey": "$secret.AWS_SECRET_ACCESS_KEY" } }',
      },
    ],
  },
  'firehose-records': {
    text: 'Each record is the mapped data object, or the full event when the mapping produced none, followed by a newline. Set settings.newline: false when the stream adds its own new line delimiter. Batching is on by default (500 records or 1 s); calls carry at most 500 records and 2,900,000 bytes, and a record over 1,000,000 bytes fails as RecordTooLarge without being sent.',
  },
  'delivery-guarantee': {
    text: 'Delivery is at least once: deduplicate downstream on event.id, and keep id in mapped data. A record AWS rejects is reported as failed with code, status and retryable. There is no retry beyond the built-in AWS SDK retry: a rejected record goes to the in-memory dead letter queue of the collector, which nothing replays yet. On SNS FIFO topics MessageDeduplicationId defaults to event.id.',
  },
  'troubleshoot-errors': {
    text: 'Every failure carries code, status and retryable, and its message names the stream or topic and the region. ResourceNotFoundException: wrong settings.streamName or region. AccessDeniedException / AuthorizationErrorException: the credentials lack firehose:PutRecordBatch or sns:Publish. UnrecognizedClientException, InvalidSignatureException, ExpiredTokenException or no credentials found: check config.credentials or the environment. SNS NotFoundException: the topic does not exist; run walkeros setup or set settings.topicArn. NULL rows in Athena: the stream adds its own new line delimiter too, so set newline: false. InvalidConfig at start: a missing or conflicting setting, named in the message.',
  },
};
