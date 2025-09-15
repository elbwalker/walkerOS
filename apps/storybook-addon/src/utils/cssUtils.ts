// CSS utilities for highlighting DOM elements

// Generate dynamic CSS based on prefix
export const generateHighlightCSS = (prefix: string): string => {
  // Define selectors based on prefix
  const globalsSelector = `${prefix}globals`;
  const contextSelector = `${prefix}context`;
  const baseSelector = prefix;
  const propertySelector = `${prefix}property`;

  // Template CSS with actual selectors
  const cssTemplate = `
    /* Highlight colors - original from website */
    :root {
      --highlight-globals: #4fc3f7cc;
      --highlight-context: #ffbd44cc;
      --highlight-entity: #00ca4ecc;
      --highlight-property: #ff605ccc;
      --highlight-action: #9900ffcc;
      --highlight-background: #1f2937;
      --highlight-text: #9ca3af;
      --highlight-hover: rgba(255, 255, 255, 0.05);
      --highlight-separator: rgba(255, 255, 255, 0.05);
    }

    .highlight-globals [${globalsSelector}] {
      box-shadow: 0 0 0 2px var(--highlight-globals) !important;
    }

    .highlight-context [${contextSelector}] {
      box-shadow: 0 0 0 2px var(--highlight-context) !important;
    }

    .highlight-entity [${baseSelector}] {
      box-shadow: 0 0 0 2px var(--highlight-entity) !important;
    }

    .highlight-property [${propertySelector}] {
      box-shadow: 0 0 0 2px var(--highlight-property) !important;
    }

    .highlight-action [${prefix}action] {
      box-shadow: 0 0 0 2px var(--highlight-action) !important;
    }

    /* Combined highlights with layered solid borders */
    .highlight-entity.highlight-action [${baseSelector}][${prefix}action] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity) !important;
    }

    .highlight-entity.highlight-context [${baseSelector}][${contextSelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-entity),
        0 0 0 4px var(--highlight-context) !important;
    }

    .highlight-entity.highlight-property [${baseSelector}][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-entity),
        0 0 0 4px var(--highlight-property) !important;
    }

    .highlight-action.highlight-context [${prefix}action][${contextSelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-context) !important;
    }

    .highlight-context.highlight-property [${contextSelector}][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-context),
        0 0 0 4px var(--highlight-property) !important;
    }

    .highlight-action.highlight-property [${prefix}action][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-property) !important;
    }

    /* Globals combinations */
    .highlight-globals.highlight-entity [${globalsSelector}][${baseSelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-entity) !important;
    }

    .highlight-globals.highlight-action [${globalsSelector}][${prefix}action] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-action) !important;
    }

    .highlight-globals.highlight-context [${globalsSelector}][${contextSelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-context) !important;
    }

    .highlight-globals.highlight-property [${globalsSelector}][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-property) !important;
    }

    /* Triple combinations with globals */
    .highlight-globals.highlight-entity.highlight-action
      [${globalsSelector}][${baseSelector}][${prefix}action] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-action) !important;
    }

    .highlight-globals.highlight-entity.highlight-context
      [${globalsSelector}][${baseSelector}][${contextSelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-context) !important;
    }

    .highlight-globals.highlight-entity.highlight-property
      [${globalsSelector}][${baseSelector}][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-property) !important;
    }

    .highlight-globals.highlight-action.highlight-context
      [${globalsSelector}][${prefix}action][${contextSelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-action),
        0 0 0 6px var(--highlight-context) !important;
    }

    .highlight-globals.highlight-action.highlight-property
      [${globalsSelector}][${prefix}action][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-action),
        0 0 0 6px var(--highlight-property) !important;
    }

    .highlight-globals.highlight-context.highlight-property
      [${globalsSelector}][${contextSelector}][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-context),
        0 0 0 6px var(--highlight-property) !important;
    }

    /* Triple combinations with distinct layers */
    .highlight-entity.highlight-action.highlight-context
      [${baseSelector}][${prefix}action][${contextSelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-context) !important;
    }

    /* Triple combinations with property */
    .highlight-entity.highlight-action.highlight-property
      [${baseSelector}][${prefix}action][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-property) !important;
    }

    .highlight-entity.highlight-context.highlight-property
      [${baseSelector}][${contextSelector}][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-context),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-property) !important;
    }

    .highlight-action.highlight-context.highlight-property
      [${prefix}action][${contextSelector}][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-context),
        0 0 0 6px var(--highlight-property) !important;
    }

    /* Quadruple combinations with globals */
    .highlight-globals.highlight-entity.highlight-action.highlight-context
      [${globalsSelector}][${baseSelector}][${prefix}action][${contextSelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-action),
        0 0 0 8px var(--highlight-context) !important;
    }

    .highlight-globals.highlight-entity.highlight-action.highlight-property
      [${globalsSelector}][${baseSelector}][${prefix}action][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-action),
        0 0 0 8px var(--highlight-property) !important;
    }

    .highlight-globals.highlight-entity.highlight-context.highlight-property
      [${globalsSelector}][${baseSelector}][${contextSelector}][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-context),
        0 0 0 8px var(--highlight-property) !important;
    }

    .highlight-globals.highlight-action.highlight-context.highlight-property
      [${globalsSelector}][${prefix}action][${contextSelector}][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-action),
        0 0 0 6px var(--highlight-context),
        0 0 0 8px var(--highlight-property) !important;
    }

    /* Quadruple combination */
    .highlight-entity.highlight-action.highlight-context.highlight-property
      [${baseSelector}][${prefix}action][${contextSelector}][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-action),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-context),
        0 0 0 8px var(--highlight-property) !important;
    }

    /* Quintuple combination with all attributes */
    .highlight-globals.highlight-entity.highlight-action.highlight-context.highlight-property
      [${globalsSelector}][${baseSelector}][${prefix}action][${contextSelector}][${propertySelector}] {
      box-shadow:
        0 0 0 2px var(--highlight-globals),
        0 0 0 4px var(--highlight-entity),
        0 0 0 6px var(--highlight-action),
        0 0 0 8px var(--highlight-context),
        0 0 0 10px var(--highlight-property) !important;
    }
  `;

  return cssTemplate;
};

// Function to inject highlighting CSS into story document
export const injectHighlightingCSS = (
  storyDoc: Document,
  prefix: string = 'data-custom',
): void => {
  // Remove existing styles
  const existingStyle = storyDoc.querySelector('#walkeros-highlighting');
  if (existingStyle) {
    existingStyle.remove();
  }

  const highlightingStyleElement = storyDoc.createElement('style');
  highlightingStyleElement.id = 'walkeros-highlighting';
  const css = generateHighlightCSS(prefix);
  highlightingStyleElement.textContent = css;

  storyDoc.head.appendChild(highlightingStyleElement);
};
