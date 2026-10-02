/**
 * Structural reads of values the tools receive untyped: app responses
 * (`ToolClient` returns `unknown`) and loaded configs. Each reader checks the
 * shape it returns, so a field that is not what a tool expects reads as
 * absent instead of being asserted into place.
 */
import type { Flow } from '@walkeros/core';
import { schemas, type z } from '@walkeros/core/dev';

/** A plain JSON object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A string field of an object, absent when it is not a string. */
export function stringField(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  return typeof field === 'string' ? field : undefined;
}

/** An object field of an object, absent when it is not an object. */
export function recordField(
  value: unknown,
  key: string,
): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  return isRecord(field) ? field : undefined;
}

/** The fields of an object response to spread into a result; none otherwise. */
export function fieldsOf(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

/**
 * A flow config (`Flow.Json`): an object with a `flows` object, the same
 * shallow check the CLI's push makes. Every consumer passes it on to the CLI,
 * which validates the config in depth.
 */
export function isFlowJson(value: unknown): value is Flow.Json {
  return isRecord(value) && isRecord(value.flows);
}

/** A step example as core's `StepExampleSchema` reads it. */
export type StepExampleView = z.infer<
  typeof schemas.FlowSchemas.StepExampleSchema
>;

/**
 * The step examples of an object, each checked with core's
 * `StepExampleSchema`. Names that fail it are returned as `skipped`, so a
 * caller reports them instead of dropping them unseen.
 */
export function stepExamplesOf(
  value: unknown,
):
  | { examples: Record<string, StepExampleView>; skipped: string[] }
  | undefined {
  if (!isRecord(value)) return undefined;
  const examples: Record<string, StepExampleView> = {};
  const skipped: string[] = [];
  for (const [name, example] of Object.entries(value)) {
    const parsed = schemas.FlowSchemas.StepExampleSchema.safeParse(example);
    if (parsed.success) examples[name] = parsed.data;
    else skipped.push(name);
  }
  return { examples, skipped };
}
