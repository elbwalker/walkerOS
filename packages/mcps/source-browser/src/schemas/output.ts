import { z } from 'zod';

export const GenerateTaggingOutputShape = {
  attributes: z
    .record(z.string(), z.string())
    .describe('Generated HTML data attributes'),
  html: z.string().describe('Example HTML element with the attributes applied'),
};

const eventShape = z.object({
  entity: z.string(),
  action: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  trigger: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  nested: z.array(z.unknown()).optional(),
});

export const ParseTaggingOutputShape = {
  events: z.array(eventShape).describe('Extracted walkerOS events'),
  globals: z.record(z.string(), z.unknown()).describe('Global properties'),
  summary: z.string().describe('Human-readable summary'),
};

const validationIssueShape = z.object({
  check: z.string().describe('Name of the validation check'),
  message: z.string().describe('Human-readable description'),
  element: z.string().describe('HTML snippet of the problematic element'),
});

export const ValidateTaggingOutputShape = {
  valid: z.boolean().describe('True if no errors found'),
  errors: z.array(validationIssueShape).describe('Critical issues'),
  warnings: z.array(validationIssueShape).describe('Potential issues'),
  info: z.array(validationIssueShape).describe('Informational notes'),
  summary: z.string().describe('Human-readable validation summary'),
};
