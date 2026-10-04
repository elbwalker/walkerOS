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
 * Handles quoted values containing the separator and backslash escapes:
 * a backslash keeps the next character, e.g. `\;`, in the current part.
 * Parts keep their quotes and escapes, splitKeyVal removes them.
 * @param str - String to split
 * @param separator - Separator character (default: ';')
 * @returns Array of attribute strings
 */
export function splitAttribute(str: string, separator = ';'): string[] {
  if (!str) return [];
  // An escape pair, a quote group, or any other non-separator char. A quote
  // group only closes before a separator, a colon or the end, so a quote that
  // closes none, like the apostrophe in "Men's", is a plain character.
  const reg = new RegExp(
    `(?:\\\\[\\s\\S]?|'(?:\\\\[\\s\\S]|[^'\\\\])*'(?=\\s*(?:[${separator}:]|$))|[^${separator}\\\\])+`,
    'g',
  );
  return str.match(reg) || [];
}

/**
 * Split key-value pair by the first unescaped colon
 * Removes surrounding whitespace and quotes and resolves backslash escapes
 * in both key and value.
 * @param str - String in format "key:value"
 * @returns Tuple of [key, value]
 */
export function splitKeyVal(str: string): [string, string] {
  const [, key = str, value = ''] =
    str.match(/^((?:\\[\s\S]|[^\\:])*):([\s\S]*)$/) || [];
  return [unquote(key), unquote(value)];
}

// Drop unescaped surrounding quotes, resolve escapes and trim whitespace.
function unquote(str: string): string {
  return str
    .replace(/^\s*'|\\([\s\S])|'\s*$/g, (_, char?: string) => char || '')
    .trim();
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
