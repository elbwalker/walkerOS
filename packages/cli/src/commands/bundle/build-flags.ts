import type { BuildFlag, Flow } from '@walkeros/core';
import { isObject } from '@walkeros/core';

/**
 * Build-time feature flags for browser bundles (see @walkeros/core
 * build-flags). The CLI defines every flag, true or false, so no guard
 * survives into a bundle and a feature the flow does not use folds out.
 * Only browser bundles get them: the `cdn` stage 2 and the browser wrap.
 */

/** The optional runtime features a flow uses. */
export interface FlowNeeds {
  observe: boolean;
  stores: boolean;
  state: boolean;
}

/** Whether a step declares `state`. A config the CLI cannot read counts. */
function carriesState(step: { state?: unknown; config?: unknown }): boolean {
  if (step.state !== undefined) return true;
  if (step.config === undefined) return false;
  return !isObject(step.config) || step.config.state !== undefined;
}

/** Read the optional runtime features off a flow's config. */
export function flowNeeds(flow: Flow): FlowNeeds {
  const steps = [
    ...Object.values(flow.sources ?? {}),
    ...Object.values(flow.transformers ?? {}),
    ...Object.values(flow.destinations ?? {}),
  ];
  return {
    observe:
      flow.config?.observe !== undefined ||
      flow.collector?.observe !== undefined,
    stores: Object.keys(flow.stores ?? {}).length > 0,
    state: steps.some(carriesState),
  };
}

/**
 * The esbuild `define` map for a browser bundle. Validation is always off:
 * the CLI validates the flow at build time. Without needs (a skeleton from an
 * older CLI) every flag is on, which is the full behaviour.
 */
export function buildFlagDefines(
  needs: FlowNeeds | undefined,
): Record<BuildFlag, string> {
  if (!needs) {
    return {
      __WALKEROS_OBSERVE__: 'true',
      __WALKEROS_STORES__: 'true',
      __WALKEROS_STATE__: 'true',
      __WALKEROS_VALIDATE__: 'true',
    };
  }
  return {
    __WALKEROS_OBSERVE__: String(needs.observe),
    __WALKEROS_STORES__: String(needs.stores),
    __WALKEROS_STATE__: String(needs.state),
    __WALKEROS_VALIDATE__: 'false',
  };
}

/**
 * A browser skeleton ends with its flow's needs, so the publish-time wrap can
 * define the flags without the flow. The wrap reads it as text, the way it
 * reads the `__devExports` registry.
 */
const NEEDS_MARKER = 'walkeros:needs';

export function needsMarker(needs: FlowNeeds): string {
  return `/* ${NEEDS_MARKER} ${JSON.stringify(needs)} */`;
}

/** The needs a skeleton carries; undefined when an older CLI wrote it. */
export function readNeedsMarker(skeleton: string): FlowNeeds | undefined {
  const match = new RegExp(`/\\* ${NEEDS_MARKER} (\\{[^}]*\\}) \\*/\\s*$`).exec(
    skeleton,
  );
  if (!match) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return undefined;
  }
  if (!isObject(parsed)) return undefined;
  const { observe, stores, state } = parsed;
  if (
    typeof observe !== 'boolean' ||
    typeof stores !== 'boolean' ||
    typeof state !== 'boolean'
  )
    return undefined;
  return { observe, stores, state };
}
