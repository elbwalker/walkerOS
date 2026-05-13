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
// RouteConfig is a disjoint union enforcing exactly one of next/one/many/gate.
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

const RouteGateConfigSchema = z.strictObject({
  match: MatchExpressionSchema,
});

const RouteConfigSchema = z.union([
  RouteNextConfigSchema,
  RouteOneConfigSchema,
  RouteManyConfigSchema,
  RouteGateConfigSchema,
]);

export const RouteSchema: z.ZodType = z
  .union([z.string(), z.array(z.lazy(() => RouteSchema)), RouteConfigSchema])
  .meta({
    id: 'Route',
    title: 'Route',
    description:
      'Recursive route: string ID, sequence of routes, or a RouteConfig (next/one/many/gate).',
  });

// Restricted Route grammar for post-collector positions (destination.before).
// `many` is forbidden at any depth: post-collector fan-out is expressed by
// configuring multiple destinations, not by branching the chain.
const RouteNextConfigSchema_NoMany = z.strictObject({
  match: MatchExpressionSchema.optional(),
  next: z.lazy(() => RouteWithoutManySchema),
});

const RouteOneConfigSchema_NoMany = z.strictObject({
  match: MatchExpressionSchema.optional(),
  one: z.array(z.lazy(() => RouteWithoutManySchema)),
});

const RouteConfigSchema_NoMany = z.union([
  RouteNextConfigSchema_NoMany,
  RouteOneConfigSchema_NoMany,
  RouteGateConfigSchema,
]);

export const RouteWithoutManySchema: z.ZodType = z
  .union([
    z.string(),
    z.array(z.lazy(() => RouteWithoutManySchema)),
    RouteConfigSchema_NoMany,
  ])
  .meta({
    id: 'RouteWithoutMany',
    title: 'RouteWithoutMany',
    description:
      'Route variant for post-collector positions (destination.before). Excludes the many operator — post-collector fan-out uses the destinations map.',
  });
