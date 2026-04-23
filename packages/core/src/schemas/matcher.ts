import { z } from './validation';

const MatchOperatorSchema = z
  .enum(['eq', 'contains', 'prefix', 'suffix', 'regex', 'gt', 'lt', 'exists'])
  .meta({
    id: 'MatcherOperator',
    title: 'Matcher.Operator',
    description: 'Supported operators for a match condition.',
  });

const MatchConditionSchema = z
  .object({
    key: z.string(),
    operator: MatchOperatorSchema,
    value: z.string(),
    not: z.boolean().optional(),
  })
  .meta({
    id: 'MatcherCondition',
    title: 'Matcher.Condition',
    description: 'Single match condition (key, operator, value, optional not).',
  });

export const MatchExpressionSchema: z.ZodType = z
  .union([
    MatchConditionSchema,
    z.object({ and: z.array(z.lazy(() => MatchExpressionSchema)) }),
    z.object({ or: z.array(z.lazy(() => MatchExpressionSchema)) }),
  ])
  .meta({
    id: 'MatcherExpression',
    title: 'Matcher.Expression',
    description: 'Boolean expression tree of match conditions (leaf, and, or).',
  });

const MatchOrWildcard = z.union([MatchExpressionSchema, z.literal('*')]);

// Recursive: NextRule.next is itself a RoutableNext
export const RoutableNextSchema: z.ZodType = z
  .union([
    z.string(),
    z.array(z.string()),
    z.array(
      z.object({
        match: MatchOrWildcard,
        next: z.lazy(() => RoutableNextSchema),
      }),
    ),
  ])
  .meta({
    id: 'MatcherNext',
    title: 'Matcher.Next',
    description:
      'Routable next target: ID, ID list, or list of {match, next} rules.',
  });

export const NextRuleSchema = z
  .object({
    match: MatchOrWildcard,
    next: z.lazy(() => RoutableNextSchema),
  })
  .meta({
    id: 'MatcherNextRule',
    title: 'Matcher.NextRule',
    description:
      'Single routing rule pairing a match expression with a next target.',
  });
