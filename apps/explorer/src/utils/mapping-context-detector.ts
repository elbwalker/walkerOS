export interface MappingContext {
  entity: string;
  action: string;
}

/**
 * Detect the entity/action context from a JSON path that includes "mapping".
 *
 * The mapping structure in flow.json is:
 * flows.<name>.destinations.<name>.mapping.<entity>.<action>.<...>
 *
 * After the "mapping" key, the next two segments are entity and action.
 *
 * @param pathSegments - JSON path segments from root to cursor position
 * @returns Entity and action if inside a mapping rule, null otherwise
 */
export function detectMappingContext(
  pathSegments: string[],
): MappingContext | null {
  const mappingIndex = pathSegments.indexOf('mapping');
  if (mappingIndex === -1) return null;

  const entity = pathSegments[mappingIndex + 1];
  const action = pathSegments[mappingIndex + 2];

  if (!entity || !action) return null;

  return { entity, action };
}
