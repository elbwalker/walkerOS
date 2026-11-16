import { schemas, z } from '@walkeros/core/dev';
import { CustomDimensionsSchema } from './settings';

const { ValueSchema } = schemas;

export const MappingSchema = z.object({
  goalId: z
    .union([z.string(), z.number()])
    .describe(
      'Matomo goal ID, a positive integer; adds a goal hit to the same request',
    )
    .optional(),
  goalValue: ValueSchema.describe(
    'Goal revenue, a mapping value resolved against the event (like "data.value"), sent as revenue on the goal hit',
  ).optional(),
  customDimensions: CustomDimensionsSchema.describe(
    'Custom dimensions for this rule, keyed by bare dimension id. Values are mapping values resolved against the event (like { "1": "data.size" }). Wins per key over the destination customDimensions.',
  ).optional(),
  items: ValueSchema.describe(
    'Order or cart items for trackEcommerceOrder and trackEcommerceCartUpdate: a mapping value resolving to a list of { sku, name, category, price, quantity }',
  ).optional(),
  ecommerceView: ValueSchema.describe(
    'Product view for trackPageView: a mapping value resolving to { sku, name, category, price }, sent as _pks, _pkn, _pkc, _pkp on the page view, as Matomo records a product page view',
  ).optional(),
});
