import type { FlowRuntime } from './runtime/types.js';
import type { ToolSpec } from './tool-spec.js';
import { createLocalToolSpecs, type LocalToolSpecs } from './specs.js';
import { createFlowBundleToolSpec } from './tools/bundle.js';
import { createFlowSimulateToolSpec } from './tools/simulate.js';
import { createFlowPushToolSpec } from './tools/push.js';

/**
 * The eight tools of the local server, keyed by name, over one runtime: the
 * five shared specs plus the three that run caller code. A type alias, not an
 * interface, so it is assignable to Record<string, ToolSpec>.
 */
export type LocalServerToolSpecs = LocalToolSpecs & {
  flow_bundle: ToolSpec;
  flow_simulate: ToolSpec;
  flow_push: ToolSpec;
};

export function createToolHandlers(runtime: FlowRuntime): LocalServerToolSpecs {
  return {
    ...createLocalToolSpecs(runtime),
    flow_bundle: createFlowBundleToolSpec(runtime),
    flow_simulate: createFlowSimulateToolSpec(runtime),
    flow_push: createFlowPushToolSpec(runtime),
  };
}
