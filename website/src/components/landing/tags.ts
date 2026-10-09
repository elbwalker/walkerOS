import type { DataAttributes } from '@walkeros/explorer/design/components';
import { tagger } from '../tagger';

/**
 * A section root: its entity and an impression. Nothing else: walkerOS
 * collects an entity's properties from every descendant, so a value set here
 * would land on the section's own event.
 */
export function sectionTags(entity: string): DataAttributes {
  return tagger(entity).entity(entity).action('impression', 'view').get();
}

/**
 * A card that carries a value is its own entity, so a click inside it becomes
 * that entity's event with the value (`plan select` with `plan: support`).
 */
export function cardTags(
  entity: string,
  key: string,
  value: string,
): DataAttributes {
  return tagger(entity).entity(entity).data(key, value).get();
}

/** A click action without a value of its own; it resolves to the nearest entity. */
export function actionTags(action: string): DataAttributes {
  return tagger().action('click', action).get();
}
