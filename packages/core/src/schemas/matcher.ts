import { z } from './validation';

const MatchOperatorSchema = z.enum([
  'eq',
  'contains',
  'prefix',
  'suffix',
  'regex',
  'gt',
  'lt',
  'exists',
]);

const MatchConditionSchema = z.object({
  key: z.string(),
  operator: MatchOperatorSchema,
  value: z.string(),
  not: z.boolean().optional(),
});

export const MatchExpressionSchema: z.ZodType = z.union([
  MatchConditionSchema,
  z.object({ and: z.array(z.lazy(() => MatchExpressionSchema)) }),
  z.object({ or: z.array(z.lazy(() => MatchExpressionSchema)) }),
]);

const MatchOrWildcard = z.union([MatchExpressionSchema, z.literal('*')]);

// Recursive: NextRule.next is itself a RoutableNext
export const RoutableNextSchema: z.ZodType = z.union([
  z.string(),
  z.array(z.string()),
  z.array(
    z.object({
      match: MatchOrWildcard,
      next: z.lazy(() => RoutableNextSchema),
    }),
  ),
]);

export const NextRuleSchema = z.object({
  match: MatchOrWildcard,
  next: z.lazy(() => RoutableNextSchema),
});
