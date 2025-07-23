import { trim } from '@walkerOS/core';

/**
 * Get attribute value from element
 * @param element - DOM element
 * @param name - Attribute name
 * @returns Trimmed attribute value or empty string
 */
export function getAttribute(element: Element, name: string): string {
  return (element.getAttribute(name) || '').trim();
}

/**
 * Split attribute string by separator (semicolon by default)
 * Handles quoted values containing the separator
 * @param str - String to split
 * @param separator - Separator character (default: ';')
 * @returns Array of attribute strings
 */
export function splitAttribute(str: string, separator = ';'): string[] {
  if (!str) return [];
  const reg = new RegExp(`(?:[^${separator}']+|'[^']*')+`, 'ig');
  return str.match(reg) || [];
}

/**
 * Split key-value pair by first colon
 * @param str - String in format "key:value"
 * @returns Tuple of [key, value]
 */
export function splitKeyVal(str: string): [string, string] {
  const [key, value] = str.split(/:(.+)/, 2);
  return [trim(key || ''), trim(value || '')];
}

/**
 * Parse inline configuration string into object
 * Supports type conversion for boolean and numeric values
 * @param str - Configuration string (e.g., "elb:track;run:false;port:3000")
 * @returns Parsed configuration object
 */
export function parseInlineConfig(str: string): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  splitAttribute(str).forEach((pair) => {
    const [key, value] = splitKeyVal(pair);
    if (key) {
      // Type conversion
      if (value === 'true') {
        config[key] = true;
      } else if (value === 'false') {
        config[key] = false;
      } else if (value && /^\d+$/.test(value)) {
        config[key] = parseInt(value, 10);
      } else if (value && /^\d+\.\d+$/.test(value)) {
        config[key] = parseFloat(value);
      } else if (value) {
        config[key] = value;
      } else {
        // Key without value defaults to true
        config[key] = true;
      }
    }
  });

  return config;
}
