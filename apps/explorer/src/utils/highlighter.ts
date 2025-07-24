// CSS class names for highlighting
export const HIGHLIGHT_CLASSES = {
  tag: 'explorer-tag',
  elbAttr: 'explorer-elb-attr',
  elbValue: 'explorer-elb-value',
  attr: 'explorer-attr',
  value: 'explorer-value',
} as const;

/**
 * Simplified but robust highlighting for HTML
 * Uses the same logic as React SyntaxHighlighter but adapted for vanilla JS
 */
export function highlightHTML(html: string): string {
  // First escape the HTML
  let result = escapeHtml(html);

  // Apply syntax highlighting in order of precedence

  // 1. Highlight HTML tag names (between < and space/> )
  result = result.replace(
    /(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)/g,
    `$1<span class="${HIGHLIGHT_CLASSES.tag}">$2</span>`,
  );

  // 2. Highlight elb attributes specifically (data-elb*)
  result = result.replace(
    /(\s)(data-elb[a-zA-Z0-9-]*)(=)/g,
    `$1<span class="${HIGHLIGHT_CLASSES.elbAttr}">$2</span>$3`,
  );

  // 3. Highlight elb attribute values (values that follow elb attributes)
  result = result.replace(
    /(<span class="explorer-elb-attr">data-elb[a-zA-Z0-9-]*<\/span>=)(&quot;)([^&]*?)(&quot;)/g,
    `$1$2<span class="${HIGHLIGHT_CLASSES.elbValue}">$3</span>$4`,
  );

  // 4. Highlight other attributes (excluding already highlighted elb ones)
  result = result.replace(
    /(\s)([a-zA-Z-]+)(=)(?![^<]*<\/span>)/g,
    (match, space, attrName, equals, offset, string) => {
      // Skip if this attribute was already wrapped in a span
      const beforeMatch = string.substring(0, offset);
      if (
        beforeMatch.includes(
          `<span class="${HIGHLIGHT_CLASSES.elbAttr}">${attrName}</span>`,
        )
      ) {
        return match;
      }
      return `${space}<span class="${HIGHLIGHT_CLASSES.attr}">${attrName}</span>${equals}`;
    },
  );

  // 5. Highlight other attribute values (excluding already highlighted elb ones)
  result = result.replace(
    /(<span class="explorer-attr">[^<]+<\/span>=)(&quot;)([^&]*?)(&quot;)/g,
    `$1$2<span class="${HIGHLIGHT_CLASSES.value}">$3</span>$4`,
  );

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
