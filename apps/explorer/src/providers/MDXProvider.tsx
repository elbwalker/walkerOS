import React, { type FC, type PropsWithChildren } from 'react';
import { MDXProvider as BaseMDXProvider } from '@mdx-js/react';
import { MDXCode } from '../components/atoms/mdx-code';
import { CodeBox } from '../components/molecules/code-box';
import { PropertyTable } from '../components/molecules/property-table';

/**
 * MDXProvider - Makes components available in MDX files without explicit imports
 *
 * This provider wraps MDX content and injects React components for HTML elements.
 * Components are automatically used when rendering markdown/MDX content.
 *
 * Key features:
 * - No imports needed in MDX files
 * - Consistent styling across all documentation
 * - Theme-aware (respects data-theme attribute)
 * - Automatic inline vs block code detection
 *
 * Available components (no import needed):
 * - CodeBox: Monaco editor for code display (also auto-used for ```code blocks)
 * - PropertyTable: Display schema-based property documentation
 *
 * @example
 * // Wrap your app
 * <MDXProvider>
 *   <App />
 * </MDXProvider>
 *
 * @example
 * // Then in any .mdx file, no imports needed:
 * # Documentation
 *
 * Inline `code` and markdown blocks:
 * ```typescript
 * const example = "Hello";
 * ```
 *
 * Or use components directly:
 * <CodeBox code="const x = 1;" language="javascript" />
 * <PropertyTable schema={mySchema} />
 */
export const MDXProvider: FC<PropsWithChildren> = ({ children }) => {
  const components = {
    // Markdown element mappings
    code: MDXCode, // Auto-handles ```code blocks

    // Explorer components (no import needed in MDX)
    CodeBox,
    PropertyTable,
  };

  return <BaseMDXProvider components={components}>{children}</BaseMDXProvider>;
};
