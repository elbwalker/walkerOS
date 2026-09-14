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

// A string context is either a BotContext literal or a lookup path. The dot is
// what tells them apart, so a typo fails validation instead of silently
// becoming a path lookup that resolves to nothing. It has to be `.regex`, not
// `.refine`: only the former survives into the generated JSON Schema, which is
// what `walkeros validate` and the MCP catalog actually check against.
const DottedPathSchema = z.string().regex(/\./, {
  message:
    'A string context is either a BotContext literal or a dot-path lookup like "ingest.transport"; to pin a literal inside a fallback chain use {"value": "beacon"}',
});

const ContextObjectSchema = z.object({
  key: z.string().optional(),
  value: z.unknown().optional(),
  fn: z.string().optional(),
});

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
      .union([
        z.enum(['auto', 'navigation', 'pixel', 'beacon', 'fetch', 'server']),
        DottedPathSchema,
        ContextObjectSchema,
        z.array(z.union([DottedPathSchema, ContextObjectSchema])),
      ])
      .optional()
      .describe(
        'How the request reaches the collector. An enum literal ("beacon") pins one context for every request. Any other form is a Mapping.Value resolved per request against { event, ingest }: a dot-path string ("ingest.transport"), a {key}/{value}/{fn} object, or a fallback array tried in order ([{key: "ingest.transport"}, {value: "beacon"}]). Wire transport truth in via the source config, e.g. express ingest map transport: {key: "query.transport"} with a ?transport= param on the collect URL. A result that is not a valid context falls back to "auto" (context-independent checks only, reported as "context_undetermined"): scored less, never scored wrong.',
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
