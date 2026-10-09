import type { Mapping, WalkerOS } from '@walkeros/core';
import { MAPPING_EVENTS } from '../data/destination-mapping';

// Compile time: every rule the demo shows is a walkerOS mapping rule and every
// event a walkerOS event (explorer's typecheck reaches test files).
const rules = MAPPING_EVENTS.flatMap((event) =>
  event.destinations.map((destination) => destination.rule),
) satisfies Mapping.Rule[];

const events = MAPPING_EVENTS.map(({ entity, action, data, nested }) => ({
  name: `${entity} ${action}`,
  entity,
  action,
  data,
  nested,
})) satisfies WalkerOS.DeepPartialEvent[];

it('shows three events through four destinations', () => {
  expect(rules).toHaveLength(12);
  expect(events).toHaveLength(3);
  expect(
    MAPPING_EVENTS.map((event) =>
      event.destinations.map((destination) => destination.id),
    ),
  ).toEqual(
    Array.from({ length: 3 }, () => ['ga4', 'meta', 'tiktok', 'amplitude']),
  );
});
