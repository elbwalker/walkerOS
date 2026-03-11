import { z } from 'zod';

export const CodeSchema = z.object({
  lang: z
    .string()
    .optional()
    .describe('Language identifier (e.g. json, sql, bash, typescript)'),
  code: z.string().describe('Code snippet'),
});

export const HintSchema = z.object({
  text: z
    .string()
    .describe('Short actionable hint text focused on walkerOS usage'),
  code: z.array(CodeSchema).optional().describe('Optional code snippets'),
});

export const HintsSchema = z
  .record(z.string(), HintSchema)
  .describe(
    'Keyed hints for AI consumption — lightweight context beyond schemas and examples',
  );
