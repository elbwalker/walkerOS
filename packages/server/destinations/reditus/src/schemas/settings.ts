import { z } from '@walkeros/core/dev';
import { CallTypeSchema } from './primitives';

export const SettingsSchema = z
  .object({
    apiKey: z
      .string()
      .min(1)
      .describe('Reditus API token, sent as Bearer token (like rds_ABC123...)'),
    type: CallTypeSchema.describe(
      'Call made when the rule sets no type: conversion or payment. Default: conversion',
    ).optional(),
    url: z
      .string()
      .url()
      .describe('Reditus API base URL (like https://api.getreditus.com/api)')
      .optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
