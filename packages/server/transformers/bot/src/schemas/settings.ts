import { z } from '@walkeros/core/dev';

const MappingValueSchema = z.union([
  z.string().describe('Dot-notation path like "ingest.userAgent"'),
  z
    .object({
      key: z.string().optional(),
      value: z.unknown().optional(),
      fn: z.string().optional(),
    })
    .describe('Mapping value object'),
]);

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
      })
      .optional()
      .describe(
        'Input signal sources, resolved via getMappingValue against { event, ingest }. v1 only reads userAgent; other fields reserved for v1.1 header heuristics.',
      ),
    output: z
      .object({
        botScore: z
          .string()
          .optional()
          .describe(
            'Path for bot score (0-99, higher = more bot). Default: "user.botScore". Use "ingest.*" to route to pipeline scratch instead of the event. Empty string or omit = skip.',
          ),
        agentScore: z
          .string()
          .optional()
          .describe(
            'Path for AI agent score (0-99). v1 emits 0 (no match) or 95 (UA-map match). Default: "user.agentScore".',
          ),
        agentProduct: z
          .string()
          .optional()
          .describe(
            'Path for matched UA substring (e.g. "ChatGPT-User"). Off by default — set to enable.',
          ),
      })
      .optional()
      .describe('Output paths for bot/agent annotations.'),
  })
  .describe(
    'Bot detection transformer: annotates events with bot and AI-agent scores.',
  );

export type Settings = z.infer<typeof SettingsSchema>;
