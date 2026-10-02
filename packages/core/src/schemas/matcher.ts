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
// RouteConfig is a disjoint union enforcing exactly one of
// next/one/many/stop/gate.
const RouteNextConfigSchema = z.strictObject({
  match: MatchExpressionSchema.optional(),
  next: z.lazy(() => RouteSchema),
});

const RouteOneConfigSchema = z.strictObject({
  match: MatchExpressionSchema.optional(),
  one: z.array(z.lazy(() => RouteSchema)),
});

const RouteManyConfigSchema = z.strictObject({
  match: MatchExpressionSchema.optional(),
  many: z.array(z.lazy(() => RouteSchema)),
});

const RouteStopConfigSchema = z.strictObject({
  match: MatchExpressionSchema.optional(),
  stop: z.literal(true),
});

const RouteGateConfigSchema = z.strictObject({
  match: MatchExpressionSchema,
});

const RouteConfigSchema = z.union([
  RouteNextConfigSchema,
  RouteOneConfigSchema,
  RouteManyConfigSchema,
  RouteStopConfigSchema,
  RouteGateConfigSchema,
]);

export const RouteSchema: z.ZodType = z
  .union([z.string(), z.array(z.lazy(() => RouteSchema)), RouteConfigSchema])
  .meta({
    id: 'Route',
    title: 'Route',
    description:
      'Recursive route: string ID, sequence of routes, or a RouteConfig (next/one/many/stop/gate). Valid in every chain field.',
  });
