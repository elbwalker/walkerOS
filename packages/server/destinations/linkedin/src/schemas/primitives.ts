import { z } from '@walkeros/core/dev';

/**
 * LinkedIn User ID Type Enum
 * Types of user identifiers supported by LinkedIn Conversions API
 */
export const UserIdTypeSchema = z.enum([
  'SHA256_EMAIL',
  'LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID',
  'ACXIOM_ID',
  'ORACLE_MOAT_ID',
]);

/**
 * API Version Schema
 * LinkedIn-Version header value in YYYYMM format
 */
export const ApiVersionSchema = z
  .string()
  .regex(/^\d{6}$/, 'API version must be in YYYYMM format (e.g. 202604)');
