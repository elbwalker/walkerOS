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

// Recursive: Route.next is itself a RouteSpec
export const RouteSpecSchema: z.ZodType = z
  .union([
    z.string(),
    z.array(z.string()),
    z.array(
      z.object({
        match: MatchOrWildcard,
        next: z.lazy(() => RouteSpecSchema),
      }),
    ),
  ])
  .meta({
    id: 'MatcherRouteSpec',
    title: 'Matcher.RouteSpec',
    description:
      'Routable next target: ID, ID list, or list of {match, next} rules.',
  });

export const RouteSchema = z
  .object({
    match: MatchOrWildcard,
    next: z.lazy(() => RouteSpecSchema),
  })
  .meta({
    id: 'MatcherRoute',
    title: 'Matcher.Route',
    description:
      'Single routing rule pairing a match expression with a next target.',
  });
