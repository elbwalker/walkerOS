import { z } from '@walkeros/core/dev';

/**
 * X (Twitter) Identifier Type Enum
 * Types of user identifiers supported by X Conversions API.
 * Primary: twclid, hashed_email, hashed_phone_number.
 * Secondary: ip_address, user_agent.
 */
export const IdentifierTypeSchema = z.enum([
  'twclid',
  'hashed_email',
  'hashed_phone_number',
  'ip_address',
  'user_agent',
]);

/**
 * X Event ID Schema
 * Pre-registered conversion event IDs follow the pattern `tw-xxxxx-xxxxx`.
 */
export const EventIdSchema = z
  .string()
  .regex(
    /^tw-[a-z0-9]+-[a-z0-9]+$/,
    'Event ID must match X format (e.g. tw-xxxxx-xxxxx)',
  );

/**
 * API Version Schema
 * X Ads API version number (numeric string).
 */
export const ApiVersionSchema = z
  .string()
  .regex(/^\d+$/, 'API version must be numeric (e.g. "12")');
