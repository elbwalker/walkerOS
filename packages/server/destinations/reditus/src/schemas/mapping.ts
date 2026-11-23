import { z } from '@walkeros/core/dev';
import { CallTypeSchema } from './primitives';

export const MappingSchema = z.object({
  type: CallTypeSchema.describe(
    'Reditus call for this rule: conversion (POST /v2/tracking/conversion) or payment (POST /v1/payments). Default: settings.type, else conversion',
  ).optional(),
});

export type Mapping = z.infer<typeof MappingSchema>;
