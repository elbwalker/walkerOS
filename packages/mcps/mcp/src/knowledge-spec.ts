/**
 * The knowledge resources and prompts as plain data, so a host registers them
 * on its own MCP server. No MCP SDK import: the shapes are what the SDK's
 * `registerResource` and `registerPrompt` accept.
 */
import type { ZodOptional, ZodString } from 'zod';

export interface ResourceContent {
  text: string;
  mimeType: string;
}

/** A resource at one fixed URI. */
export interface StaticResourceSpec {
  kind: 'static';
  /** Registration name, for example 'flow-schema'. */
  name: string;
  uri: string;
  description: string;
  mimeType: string;
  read: () => Promise<ResourceContent>;
}

export interface ResourceListEntry {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
}

/** A URI template resource that lists its own members. */
export interface TemplateResourceSpec {
  kind: 'template';
  name: string;
  uriTemplate: string;
  title?: string;
  description: string;
  mimeType: string;
  list: () => Promise<ResourceListEntry[]>;
  /** The template variables of the requested URI, as the host parsed them. */
  read: (
    variables: Readonly<Record<string, string | string[]>>,
  ) => Promise<ResourceContent>;
}

export type ResourceSpec = StaticResourceSpec | TemplateResourceSpec;

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string };
}

/** A prompt; every argument is an optional string, as MCP prompt arguments are. */
export interface PromptSpec {
  name: string;
  description: string;
  argsSchema: Record<string, ZodOptional<ZodString>>;
  handler: (
    args: Readonly<Record<string, string | undefined>>,
  ) => Promise<{ messages: PromptMessage[] }>;
}
