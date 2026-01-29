import { z } from '@walkeros/core/dev';

/**
 * Session source settings schema
 */
export const SettingsSchema = z.object({
  storage: z
    .boolean()
    .default(false)
    .describe('Enable persistent storage for session/device IDs')
    .optional(),

  consent: z
    .union([z.string(), z.array(z.string())])
    .describe('Consent key(s) required to enable storage mode')
    .optional(),

  length: z
    .number()
    .default(30)
    .describe('Session timeout in minutes')
    .optional(),

  pulse: z
    .boolean()
    .default(false)
    .describe('Keep session alive on each event')
    .optional(),

  sessionKey: z
    .string()
    .default('elbSessionId')
    .describe('Storage key for session ID')
    .optional(),

  sessionStorage: z
    .enum(['local', 'session'])
    .default('local')
    .describe('Storage type for session')
    .optional(),

  deviceKey: z
    .string()
    .default('elbDeviceId')
    .describe('Storage key for device ID')
    .optional(),

  deviceStorage: z
    .enum(['local', 'session'])
    .default('local')
    .describe('Storage type for device')
    .optional(),

  deviceAge: z
    .number()
    .default(30)
    .describe('Device ID age in days')
    .optional(),

  cb: z
    .any()
    .describe('Custom session callback function or false to disable')
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
