// DOM utilities for working with story elements

// Function to get the story document (either iframe or main document)
export const getStoryDocument = (): Document => {
  // Try to find story iframe
  const iframe = document.querySelector(
    '#storybook-preview-iframe',
  ) as HTMLIFrameElement;
  if (iframe?.contentDocument) {
    return iframe.contentDocument;
  }
  // Fallback to main document
  return document;
};

// Function to get the story root element
export const getStoryRootElement = (): Element | null => {
  const storyDoc = getStoryDocument();

  // Try multiple selectors for story root
  const selectors = [
    '#storybook-root',
    '#root',
    '[data-testid="storybook-root"]',
    'body',
  ];

  for (const selector of selectors) {
    const element = storyDoc.querySelector(selector);
    if (element) {
      return element;
    }
  }

  return storyDoc.body;
};

// Helper to get element path
export const getElementPath = (el: Element): string => {
  const path = [];
  let current = el;
  while (current && current !== document.body && current.parentElement) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      selector += `.${current.className
        .split(' ')
        .filter((c) => c)
        .join('.')}`;
    }
    path.unshift(selector);
    current = current.parentElement;
  }
  return path.join(' > ');
};

// Function to enhance DOM with property attributes
export const enhanceProperties = (
  storyRoot: Element,
  prefix: string = 'data-custom',
): void => {
  // Find all elements with any attributes starting with prefix-
  const allElements = Array.from(storyRoot.querySelectorAll('*'));

  allElements.forEach((el) => {
    const attributes = Array.from(el.attributes);
    let hasProperties = false;

    attributes.forEach((attr) => {
      // Check if attribute starts with prefix- (e.g., data-elb-button, data-elb-product)
      if (
        attr.name.startsWith(`${prefix}-`) &&
        attr.name !== `${prefix}action` &&
        attr.name !== `${prefix}context` &&
        attr.name !== `${prefix}globals`
      ) {
        hasProperties = true;
      }
    });

    // Mark elements with property attributes
    if (hasProperties) {
      el.setAttribute(`${prefix}property`, '');
    }
  });
};
