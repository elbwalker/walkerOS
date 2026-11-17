import { z } from '@walkeros/core/dev';

/** GA4 measurement id of a web data stream. */
export const MeasurementIdSchema = z.string().regex(/^G-[A-Z0-9]+$/);
