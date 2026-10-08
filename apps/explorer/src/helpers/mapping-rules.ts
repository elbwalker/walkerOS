import {
  getErrorMessage,
  isArray,
  isObject,
  type Mapping,
} from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';

/** JSON nested as mapping rules: entity, then action, then a rule or a list of rules. */
function isRules(value: unknown): value is Mapping.Rules {
  return (
    isObject(value) &&
    Object.values(value).every(
      (actions) =>
        isObject(actions) &&
        Object.values(actions).every(
          (rule) => isObject(rule) || (isArray(rule) && rule.every(isObject)),
        ),
    )
  );
}

/** A mapping editor's text as rules, or why it is not applied. */
export function parseMapping(
  text: string,
): { rules: Mapping.Rules } | { error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return { error: `Mapping not applied: ${getErrorMessage(error)}` };
  }
  // The schema names what is wrong and where.
  const checked = schemas.RulesSchema.safeParse(json);
  if (!checked.success || !isRules(json)) {
    const issue = checked.success ? undefined : checked.error.issues[0];
    const at = issue?.path.length ? ` at ${issue.path.join('.')}` : '';
    return {
      error: `Mapping not applied: ${issue?.message ?? 'not entity, action and rule objects'}${at}`,
    };
  }
  return { rules: json };
}
