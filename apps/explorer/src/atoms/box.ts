/**
 * Box Atom Component
 * Base container with optional header and footer
 */

import type { BoxOptions, BoxAPI } from '../types';
import { createElement, clearChildren } from '../lib/dom';

/**
 * Create a box component
 */
export function createBox(
  element: HTMLElement,
  options: BoxOptions = {},
): BoxAPI {
  // Create structure directly in the element (no Shadow DOM)
  const box = createElement('div', {
    class: `elb-box ${options.className || ''} ${options.noPadding ? 'elb-box--no-padding' : ''}`,
  });

  let header: HTMLElement | null = null;
  let headerLeft: HTMLElement | null = null;
  let headerCenter: HTMLElement | null = null;
  let headerRight: HTMLElement | null = null;
  let content: HTMLElement;
  let footer: HTMLElement | null = null;

  // Header with zones
  if (
    options.showHeader !== false &&
    (options.label ||
      options.headerLeft ||
      options.headerCenter ||
      options.headerRight)
  ) {
    header = createElement('div', { class: 'elb-box-header' });

    // Left zone (label by default)
    headerLeft = createElement('div', { class: 'elb-box-header-left' });
    if (options.label) {
      const label = createElement(
        'span',
        { class: 'elb-box-label' },
        options.label,
      );
      headerLeft.appendChild(label);
    }
    if (options.headerLeft) {
      headerLeft.appendChild(options.headerLeft);
    }
    header.appendChild(headerLeft);

    // Center zone
    headerCenter = createElement('div', { class: 'elb-box-header-center' });
    if (options.headerCenter) {
      headerCenter.appendChild(options.headerCenter);
    }
    header.appendChild(headerCenter);

    // Right zone
    headerRight = createElement('div', { class: 'elb-box-header-right' });
    if (options.headerRight) {
      headerRight.appendChild(options.headerRight);
    }
    header.appendChild(headerRight);

    box.appendChild(header);
  }

  // Content
  content = createElement('div', {
    class: `elb-box-content ${options.noPadding ? 'elb-box-content--no-padding' : ''}`,
  });
  box.appendChild(content);

  // Footer
  if (options.showFooter || options.footerContent) {
    footer = createElement('div', { class: 'elb-box-footer' });

    // Add custom footer content if provided
    if (options.footerContent) {
      footer.appendChild(options.footerContent);
    }

    box.appendChild(footer);
  }

  // Append box directly to the element (no Shadow DOM container)
  element.appendChild(box);

  // API
  return {
    setLabel: (label: string) => {
      if (!header || !headerLeft) {
        // Create header if it doesn't exist
        if (!header) {
          header = createElement('div', { class: 'elb-box-header' });
          headerLeft = createElement('div', { class: 'elb-box-header-left' });
          headerCenter = createElement('div', {
            class: 'elb-box-header-center',
          });
          headerRight = createElement('div', { class: 'elb-box-header-right' });
          header.appendChild(headerLeft);
          header.appendChild(headerCenter);
          header.appendChild(headerRight);
          box.insertBefore(header, content);
        }
      }

      // Update or create label
      let labelElement = headerLeft!.querySelector(
        '.elb-box-label',
      ) as HTMLElement;
      if (!labelElement) {
        labelElement = createElement('span', { class: 'elb-box-label' });
        headerLeft!.appendChild(labelElement);
      }
      labelElement.textContent = label;
    },

    getContent: () => content,
    getHeader: () => header,
    getHeaderLeft: () => headerLeft,
    getHeaderCenter: () => headerCenter,
    getHeaderRight: () => headerRight,
    getFooter: () => footer,
    getContainer: () => box,

    destroy: () => {
      clearChildren(element);
      element.remove();
    },
  };
}
