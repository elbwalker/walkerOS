// CSS utilities for highlighting DOM elements
import { vizBg } from '@walkeros/explorer/design';
import { highlightColors } from './eventColors';

// Stacked 2px rings in the given event colours, closed by a 1px edge in the
// dark visualisation ground so the outline reads on light and dark stories.
const outline = (...colors: string[]): string =>
  [
    ...colors.map((color, index) => `0 0 0 ${(index + 1) * 2}px ${color}`),
    `0 0 0 ${colors.length * 2 + 1}px ${vizBg}`,
  ].join(', ');

// Generate dynamic CSS based on prefix
export const generateHighlightCSS = (prefix: string): string => {
  const { globals, context, entity, property, action } = highlightColors;

  // Define selectors based on prefix
  const globalsSelector = `${prefix}globals`;
  const contextSelector = `${prefix}context`;
  const baseSelector = prefix;
  const propertySelector = `${prefix}property`;

  // Template CSS with actual selectors
  const cssTemplate = `
    .highlight-globals [${globalsSelector}] {
      box-shadow: ${outline(globals)} !important;
    }

    .highlight-context [${contextSelector}] {
      box-shadow: ${outline(context)} !important;
    }

    .highlight-entity [${baseSelector}] {
      box-shadow: ${outline(entity)} !important;
    }

    .highlight-property [${propertySelector}] {
      box-shadow: ${outline(property)} !important;
    }

    .highlight-action [${prefix}action] {
      box-shadow: ${outline(action)} !important;
    }

    /* Combined highlights with layered solid borders */
    .highlight-entity.highlight-action [${baseSelector}][${prefix}action] {
      box-shadow: ${outline(action, entity)} !important;
    }

    .highlight-entity.highlight-context [${baseSelector}][${contextSelector}] {
      box-shadow: ${outline(entity, context)} !important;
    }

    .highlight-entity.highlight-property [${baseSelector}][${propertySelector}] {
      box-shadow: ${outline(entity, property)} !important;
    }

    .highlight-action.highlight-context [${prefix}action][${contextSelector}] {
      box-shadow: ${outline(action, context)} !important;
    }

    .highlight-context.highlight-property [${contextSelector}][${propertySelector}] {
      box-shadow: ${outline(context, property)} !important;
    }

    .highlight-action.highlight-property [${prefix}action][${propertySelector}] {
      box-shadow: ${outline(action, property)} !important;
    }

    /* Globals combinations */
    .highlight-globals.highlight-entity [${globalsSelector}][${baseSelector}] {
      box-shadow: ${outline(globals, entity)} !important;
    }

    .highlight-globals.highlight-action [${globalsSelector}][${prefix}action] {
      box-shadow: ${outline(globals, action)} !important;
    }

    .highlight-globals.highlight-context [${globalsSelector}][${contextSelector}] {
      box-shadow: ${outline(globals, context)} !important;
    }

    .highlight-globals.highlight-property [${globalsSelector}][${propertySelector}] {
      box-shadow: ${outline(globals, property)} !important;
    }

    /* Triple combinations with globals */
    .highlight-globals.highlight-entity.highlight-action
      [${globalsSelector}][${baseSelector}][${prefix}action] {
      box-shadow: ${outline(globals, entity, action)} !important;
    }

    .highlight-globals.highlight-entity.highlight-context
      [${globalsSelector}][${baseSelector}][${contextSelector}] {
      box-shadow: ${outline(globals, entity, context)} !important;
    }

    .highlight-globals.highlight-entity.highlight-property
      [${globalsSelector}][${baseSelector}][${propertySelector}] {
      box-shadow: ${outline(globals, entity, property)} !important;
    }

    .highlight-globals.highlight-action.highlight-context
      [${globalsSelector}][${prefix}action][${contextSelector}] {
      box-shadow: ${outline(globals, action, context)} !important;
    }

    .highlight-globals.highlight-action.highlight-property
      [${globalsSelector}][${prefix}action][${propertySelector}] {
      box-shadow: ${outline(globals, action, property)} !important;
    }

    .highlight-globals.highlight-context.highlight-property
      [${globalsSelector}][${contextSelector}][${propertySelector}] {
      box-shadow: ${outline(globals, context, property)} !important;
    }

    /* Triple combinations with distinct layers */
    .highlight-entity.highlight-action.highlight-context
      [${baseSelector}][${prefix}action][${contextSelector}] {
      box-shadow: ${outline(action, entity, context)} !important;
    }

    /* Triple combinations with property */
    .highlight-entity.highlight-action.highlight-property
      [${baseSelector}][${prefix}action][${propertySelector}] {
      box-shadow: ${outline(action, entity, property)} !important;
    }

    .highlight-entity.highlight-context.highlight-property
      [${baseSelector}][${contextSelector}][${propertySelector}] {
      box-shadow: ${outline(context, entity, property)} !important;
    }

    .highlight-action.highlight-context.highlight-property
      [${prefix}action][${contextSelector}][${propertySelector}] {
      box-shadow: ${outline(action, context, property)} !important;
    }

    /* Quadruple combinations with globals */
    .highlight-globals.highlight-entity.highlight-action.highlight-context
      [${globalsSelector}][${baseSelector}][${prefix}action][${contextSelector}] {
      box-shadow: ${outline(globals, entity, action, context)} !important;
    }

    .highlight-globals.highlight-entity.highlight-action.highlight-property
      [${globalsSelector}][${baseSelector}][${prefix}action][${propertySelector}] {
      box-shadow: ${outline(globals, entity, action, property)} !important;
    }

    .highlight-globals.highlight-entity.highlight-context.highlight-property
      [${globalsSelector}][${baseSelector}][${contextSelector}][${propertySelector}] {
      box-shadow: ${outline(globals, entity, context, property)} !important;
    }

    .highlight-globals.highlight-action.highlight-context.highlight-property
      [${globalsSelector}][${prefix}action][${contextSelector}][${propertySelector}] {
      box-shadow: ${outline(globals, action, context, property)} !important;
    }

    /* Quadruple combination */
    .highlight-entity.highlight-action.highlight-context.highlight-property
      [${baseSelector}][${prefix}action][${contextSelector}][${propertySelector}] {
      box-shadow: ${outline(action, entity, context, property)} !important;
    }

    /* Quintuple combination with all attributes */
    .highlight-globals.highlight-entity.highlight-action.highlight-context.highlight-property
      [${globalsSelector}][${baseSelector}][${prefix}action][${contextSelector}][${propertySelector}] {
      box-shadow: ${outline(globals, entity, action, context, property)} !important;
    }
  `;

  return cssTemplate;
};

// Function to inject highlighting CSS into story document
export const injectHighlightingCSS = (
  storyDoc: Document,
  prefix: string = 'data-elb',
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
