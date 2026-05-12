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

// Recursive Route grammar (Flow v4): string | Route[] | RouteConfig.
// RouteConfig is a disjoint union enforcing exactly one of next/case/gate.
const RouteNextConfigSchema = z.object({
  match: MatchExpressionSchema.optional(),
  next: z.lazy(() => RouteSchema),
});

const RouteCaseConfigSchema = z.object({
  match: MatchExpressionSchema.optional(),
  case: z.array(z.lazy(() => RouteSchema)),
});

const RouteGateConfigSchema = z.object({
  match: MatchExpressionSchema,
});

const RouteConfigSchema = z.union([
  RouteNextConfigSchema,
  RouteCaseConfigSchema,
  RouteGateConfigSchema,
]);

export const RouteSchema: z.ZodType = z
  .union([z.string(), z.array(z.lazy(() => RouteSchema)), RouteConfigSchema])
  .meta({
    id: 'Route',
    title: 'Route',
    description:
      'Recursive route: string ID, sequence of routes, or a RouteConfig (next/case/gate).',
  });

// Backward-compatible alias
export const RouteSpecSchema = RouteSchema;
