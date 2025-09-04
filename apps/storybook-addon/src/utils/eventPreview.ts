import type { WalkerOS } from '@walkeros/core';

/**
 * Creates a formatted data preview from a walkerOS event
 * Shows data and context properties in JSON-like syntax
 */
export function createEventDataPreview(event: WalkerOS.Event): string {
  const sections: string[] = [];

  // Helper to format value
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (Array.isArray(value)) {
      const items = value
        .map((v) => (typeof v === 'string' ? `"${v}"` : String(v)))
        .join(', ');
      return `[${items}]`;
    }
    if (typeof value === 'object') {
      return '{...}';
    }
    return String(value);
  };

  // Helper to format a section (data or context)
  const formatSection = (obj: any, sectionName: string): string | null => {
    if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) {
      return null;
    }

    const entries = Object.entries(obj)
      .map(([key, value]) => `${key}: ${formatValue(value)}`)
      .join(', ');

    return `${sectionName}: { ${entries} }`;
  };

  // Process data section first
  if (event.data) {
    const dataSection = formatSection(event.data, 'data');
    if (dataSection) {
      sections.push(dataSection);
    }
  }

  // Process context section second
  if (event.context) {
    const contextSection = formatSection(event.context, 'context');
    if (contextSection) {
      sections.push(contextSection);
    }
  }

  return sections.join('; ');
}
