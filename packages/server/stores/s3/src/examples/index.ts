import type { Store } from '@walkeros/core';

/** AWS S3 bucket for serving static files */
export const awsAssets: Store.Config = {
  settings: {
    bucket: 'my-assets',
    endpoint: 'https://s3.eu-west-1.amazonaws.com',
    accessKeyId: '$env.S3_ACCESS_KEY',
    secretAccessKey: '$env.S3_SECRET_KEY',
    region: 'eu-west-1',
    prefix: 'public',
  },
};

/** Cloudflare R2 bucket — no egress fees */
export const r2Bucket: Store.Config = {
  settings: {
    bucket: 'my-bucket',
    endpoint: 'https://ACCOUNT_ID.r2.cloudflarestorage.com',
    accessKeyId: '$env.R2_ACCESS_KEY',
    secretAccessKey: '$env.R2_SECRET_KEY',
  },
};

export * as step from './step';
