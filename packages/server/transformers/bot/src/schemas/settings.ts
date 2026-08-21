import { z } from '@walkeros/core/dev';

const SingleMappingValueSchema = z.union([
  z.string().describe('Dot-notation path like "ingest.userAgent"'),
  z
    .object({
      key: z.string().optional(),
      value: z.unknown().optional(),
      fn: z.string().optional(),
    })
    .describe('Mapping value object'),
]);

const MappingValueSchema = z.union([
  SingleMappingValueSchema,
  z
    .array(SingleMappingValueSchema)
    .describe('Array of fallback values, tried in order'),
]);

const OutputPathSchema = (description: string) =>
  z
    .union([z.string(), z.literal(false)])
    .optional()
    .describe(description);

export const SettingsSchema = z
  .object({
    input: z
      .object({
        userAgent: MappingValueSchema.optional(),
        ip: MappingValueSchema.optional(),
        acceptLanguage: MappingValueSchema.optional(),
        acceptEncoding: MappingValueSchema.optional(),
        secFetchSite: MappingValueSchema.optional(),
        secFetchMode: MappingValueSchema.optional(),
        secFetchDest: MappingValueSchema.optional(),
        secFetchUser: MappingValueSchema.optional(),
        secChUa: MappingValueSchema.optional(),
        secChUaMobile: MappingValueSchema.optional(),
        secChUaPlatform: MappingValueSchema.optional(),
        accept: MappingValueSchema.optional(),
        contentType: MappingValueSchema.optional(),
        referer: MappingValueSchema.optional(),
        signatureAgent: MappingValueSchema.optional(),
        method: MappingValueSchema.optional(),
        ja4: MappingValueSchema.optional(),
        headerNames: MappingValueSchema.optional(),
      })
      .optional()
      .describe(
        'Input signal sources, resolved via getMappingValue against { event, ingest }. Each defaults to "ingest.<name>". Listing a name here also declares that the signal is wired in your pipeline, which is what enables the absence-based checks for its family (client hints, Fetch Metadata, Accept-Language/Encoding). "ja4" and "headerNames" are reserved and unconsumed.',
      ),
    output: z
      .object({
        botScore: OutputPathSchema(
          'Path for the automation likelihood (0-99, higher = more automated, null when not measured). Default: "user.botScore". Use "ingest.*" to route to pipeline scratch instead of the event, or false to disable.',
        ),
        botCategory: OutputPathSchema(
          'Path for the client category: human, suspicious, automation, search-crawler, seo-tool, monitor, link-preview, ai-agent, ai-crawler, unknown. Default: "user.botCategory".',
        ),
        botProduct: OutputPathSchema(
          'Path for the identified product (e.g. "ChatGPT-User", "Googlebot"), written only when a named detector matched. Default: "user.botProduct".',
        ),
        botReasons: OutputPathSchema(
          'Path for the reason-code array. Default: "ingest.bot.reasons", so the codes stay available to the pipeline without weighting the analytics payload. Codes ending in _not_declared report which signal families are unwired.',
        ),
      })
      .optional()
      .describe('Output paths for the bot annotations.'),
    context: z
      .enum(['auto', 'navigation', 'pixel', 'beacon', 'fetch', 'server'])
      .optional()
      .describe(
        'How the request reaches the collector. Pinning it enables the context-dependent checks (Accept shape, Fetch Metadata profile, beacon Content-Type), because the same header value means opposite things in different contexts. Default: "auto", which runs the context-independent checks only and reports "context_undetermined".',
      ),
    suspiciousAt: z
      .number()
      .optional()
      .describe(
        'Graded-layer cut between category "human" and "suspicious". Default: 25. Does not affect the deterministic scores (70 and above).',
      ),
  })
  .describe(
    'Bot detection transformer: annotates events with an automation likelihood, a client category, the identified product and reason codes.',
  );

export type Settings = z.infer<typeof SettingsSchema>;
