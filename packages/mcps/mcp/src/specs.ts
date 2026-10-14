/**
 * The specs both walkerOS MCP servers share, as plain data: five tools over a
 * FlowRuntime, the knowledge resources and the prompts. This entry imports no
 * CLI main entry, no bundler, no package manager and no MCP SDK, so a server
 * process registers them on its own server; a host imports everything it
 * needs (the specs, `RuntimeRefusal`, `FlowRuntime`, the envelope helpers)
 * from `@walkeros/mcp/specs`, never from the main entry, which loads the CLI.
 * Bundle, simulate and push are not here: they run caller code and belong to
 * the local server only.
 */
import type { FlowRuntime } from './runtime/types.js';
import type { ToolSpec } from './tool-spec.js';
import type { PromptSpec, ResourceSpec } from './knowledge-spec.js';
import { createFlowValidateToolSpec } from './tools/validate.js';
import { createFlowExamplesToolSpec } from './tools/examples.js';
import { createFlowLoadToolSpec } from './tools/flow-load.js';
import {
  createPackageSearchToolSpec,
  createPackageGetToolSpec,
} from './tools/package.js';
import { REFERENCE_RESOURCES } from './resources/references.js';
import { PACKAGE_SCHEMA_RESOURCE } from './resources/package-schemas.js';
import { ADD_STEP_PROMPT } from './prompts/add-step.js';
import { SETUP_MAPPING_PROMPT } from './prompts/setup-mapping.js';
import { MANAGE_CONTRACT_PROMPT } from './prompts/manage-contract.js';

/** The five tools both walkerOS MCP servers offer, keyed by name. */
export type LocalToolSpecs = {
  flow_validate: ToolSpec;
  flow_examples: ToolSpec;
  flow_load: ToolSpec;
  package_search: ToolSpec;
  package_get: ToolSpec;
};

export function createLocalToolSpecs(runtime: FlowRuntime): LocalToolSpecs {
  return {
    flow_validate: createFlowValidateToolSpec(runtime),
    flow_examples: createFlowExamplesToolSpec(runtime),
    flow_load: createFlowLoadToolSpec(runtime),
    package_search: createPackageSearchToolSpec(),
    package_get: createPackageGetToolSpec(),
  };
}

/**
 * The reference resources plus the package schema template, in registration
 * order. No openapi entry: the app owns that resource.
 */
export const KNOWLEDGE_RESOURCES: readonly ResourceSpec[] = [
  ...REFERENCE_RESOURCES,
  PACKAGE_SCHEMA_RESOURCE,
];

/** add-step, setup-mapping, manage-contract. */
export const PROMPTS: readonly PromptSpec[] = [
  ADD_STEP_PROMPT,
  SETUP_MAPPING_PROMPT,
  MANAGE_CONTRACT_PROMPT,
];

export type { ToolSpec, ToolAnnotations } from './tool-spec.js';
export type {
  ResourceSpec,
  StaticResourceSpec,
  TemplateResourceSpec,
  ResourceContent,
  ResourceListEntry,
  PromptSpec,
  PromptMessage,
} from './knowledge-spec.js';
export type {
  FlowRuntime,
  LoadedRun,
  BundleOptions,
  SimulateOptions,
  SimulateStepType,
  PushOptions,
} from './runtime/types.js';
export { RuntimeRefusal } from './runtime/types.js';
export {
  wrapUserData,
  wrapListedRecord,
  redactNestedStrings,
  redactDisplayNames,
  keepStructural,
  STRUCTURAL_KEYS,
  type RedactOptions,
} from './user-data.js';
