export interface ActionRule {
  /** Params that must each be present for this action. */
  required?: string[];
  /** Param groups where at least one of each group must be present. */
  oneOf?: string[][];
  /** Optional discovery hint appended to the error (e.g. 'Use action "list" ...'). */
  hint?: string;
}

export type ActionRequirementMap = Record<string, ActionRule>;

/**
 * Returns a canonical error message string when `input` is missing a
 * required (or one-of) param for `action`, otherwise null. The message is
 * uniform across tools so error quality cannot drift between tools.
 * Required params are checked (and reported) before oneOf groups.
 */
export function validateActionInput(
  toolName: string,
  action: string,
  input: Record<string, unknown>,
  map: ActionRequirementMap,
): string | null {
  const rule = map[action];
  if (!rule) return null;
  for (const param of rule.required ?? []) {
    if (
      input[param] === undefined ||
      input[param] === null ||
      input[param] === ''
    ) {
      return missing(toolName, action, param, rule.hint);
    }
  }
  for (const group of rule.oneOf ?? []) {
    const satisfied = group.some(
      (p) => input[p] !== undefined && input[p] !== null && input[p] !== '',
    );
    if (!satisfied) {
      return `${toolName} action "${action}" requires one of: ${group.join(', ')}.${rule.hint ? ' ' + rule.hint : ''}`;
    }
  }
  return null;
}

/**
 * Narrows a param that the action's requirement map has already validated as
 * present, so typed client calls accept it without re-checking. The companion
 * to `validateActionInput`: callers run that first to produce a friendly error,
 * then use this assertion at the use site to recover the non-nullable type.
 * Because validation guarantees presence, this never throws in practice; the
 * throw exists only to satisfy the assertion-signature contract. The thrown
 * message mirrors the `missing()` form ("<param> is required for <action> action.").
 */
export function assertParam(
  value: string | undefined,
  param: string,
  action: string,
): asserts value is string {
  if (value === undefined || value === null || value === '')
    throw new Error(`${param} is required for ${action} action.`);
}

function missing(
  tool: string,
  action: string,
  param: string,
  hint?: string,
): string {
  // Keep the substring "<param> is required" so existing assertions/docs that
  // string-match it stay green.
  return `${param} is required for ${action} action.${hint ? ' ' + hint : ''}`;
}

export const FLOW_MANAGE_REQUIREMENTS: ActionRequirementMap = {
  get: {
    required: ['flowId'],
    hint: 'Use action "list" to see available flows.',
  },
  update: {
    required: ['flowId'],
    hint: 'Use action "list" to see available flows.',
  },
  delete: {
    required: ['flowId'],
    hint: 'Use action "list" to see available flows.',
  },
  duplicate: {
    required: ['flowId'],
    hint: 'Use action "list" to see available flows.',
  },
  create: { required: ['name'] },
  preview_list: {
    required: ['flowId'],
    hint: 'Use action "list" to see available flows.',
  },
  preview_get: { required: ['flowId', 'previewId'] },
  preview_create: {
    required: ['flowId'],
    oneOf: [['flowName', 'flowSettingsId']],
  },
  preview_delete: { required: ['flowId', 'previewId'] },
  preview_regrant: { required: ['flowId', 'previewId'] },
};

export const DEPLOY_MANAGE_REQUIREMENTS: ActionRequirementMap = {
  deploy: {
    required: ['flowId'],
    hint: 'Use flow_manage action "list" to see available flows.',
  },
  get: {
    required: ['flowId'],
    hint: 'Use flow_manage action "list" to see available flows.',
  },
  delete: {
    required: ['flowId'],
    hint: 'Use flow_manage action "list" to see available flows.',
  },
};

export const SECRET_MANAGE_REQUIREMENTS: ActionRequirementMap = {
  list: {
    required: ['flowId'],
    hint: 'Use flow_manage action "list" to see available flows.',
  },
  set: {
    required: ['flowId', 'name', 'value'],
    hint: 'Use action "list" to see existing secret names for this flow.',
  },
  update: {
    required: ['flowId', 'secretId', 'value'],
    hint: 'Use action "list" to find the secretId.',
  },
  delete: {
    required: ['flowId', 'secretId'],
    hint: 'Use action "list" to find the secretId.',
  },
};

export const PROJECT_MANAGE_REQUIREMENTS: ActionRequirementMap = {
  get: {
    required: ['projectId'],
    hint: 'Use action "list" to see available projects.',
  },
  update: {
    required: ['projectId', 'name'],
    hint: 'Use action "list" to see available projects.',
  },
  delete: {
    required: ['projectId'],
    hint: 'Use action "list" to see available projects.',
  },
  set_default: {
    required: ['projectId'],
    hint: 'Use action "list" to see available projects.',
  },
  create: { required: ['name'] },
};
