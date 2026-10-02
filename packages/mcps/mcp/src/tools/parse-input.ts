import { z, type ZodRawShape } from 'zod';
import { mcpError } from '@walkeros/core';

/** A tool's input as its input shape parses it, defaults applied. */
export type ToolInput<S extends ZodRawShape> = z.output<z.ZodObject<S>>;

/**
 * Every issue as one readable line, `path: message; ...`. A raw ZodError
 * stringifies its whole issue list into `message`, so it is never passed on
 * as is.
 */
export function inputIssuesMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
    .join('; ');
}

/**
 * Parse, never assert: a tool spec is drivable without a transport, so its
 * handler applies the same input shape the transport validates against.
 * Input that fails it comes back as an error result.
 */
export function parseToolInput<S extends ZodRawShape>(
  shape: S,
  raw: unknown,
):
  | { ok: true; data: ToolInput<S> }
  | { ok: false; error: ReturnType<typeof mcpError> } {
  const parsed = z.object(shape).safeParse(raw ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      error: mcpError(new Error(inputIssuesMessage(parsed.error))),
    };
  }
  return { ok: true, data: parsed.data };
}
