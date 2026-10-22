import { isObject } from '@walkeros/core';

/** A Google tool and the setting that identifies it. */
export interface Tool {
  tool: 'ga4' | 'ads' | 'gtm';
  id: string;
}

/**
 * The tools of which the settings configure at least one. The one
 * definition of that rule: init checks it, the settings schema refines on it
 * and states it as JSON Schema alternatives for validate and the kit.
 */
export const TOOLS: readonly Tool[] = [
  { tool: 'ga4', id: 'measurementId' },
  { tool: 'ads', id: 'conversionId' },
  { tool: 'gtm', id: 'containerId' },
];

/** The tools' setting paths in words: `ga4.measurementId, ... or gtm.containerId`. */
export const TOOL_PATHS = TOOLS.map(({ tool, id }) => `${tool}.${id}`)
  .join(', ')
  .replace(/, ([^,]*)$/, ' or $1');

/** Whether the settings configure at least one tool. */
export function hasTool(settings: unknown): boolean {
  return (
    isObject(settings) &&
    TOOLS.some(({ tool, id }) => {
      const value = settings[tool];
      return isObject(value) && Boolean(value[id]);
    })
  );
}
