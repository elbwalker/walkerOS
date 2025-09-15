// Utilities for building and managing attribute trees

import type { WalkerOS } from '@walkeros/core';
import type { AttributeNode } from '../types';
import {
  getElbAttributeName,
  getElbValues,
} from '@walkeros/web-source-browser';
import { getElementPath } from './domUtils';

// Utility to generate clean HTML markup from an element
const generateElementHTML = (element: Element): string => {
  if (!element) return '';

  const tagName = element.tagName.toLowerCase();
  const allAttribs: string[] = [];

  // Collect ALL attributes as they are
  Array.from(element.attributes).forEach((attr) => {
    allAttribs.push(`${attr.name}="${attr.value}"`);
  });

  // If no attributes, return basic element
  if (allAttribs.length === 0) {
    return `<${tagName}></${tagName}>`;
  }

  // Format attributes nicely for display
  if (allAttribs.length === 1) {
    return `<${tagName} ${allAttribs[0]}></${tagName}>`;
  }

  // Multiple attributes - format with line breaks like dev tools
  const formattedAttribs = allAttribs.map((attr) => `  ${attr}`).join('\n');
  return `<${tagName}\n${formattedAttribs}\n></${tagName}>`;
};

// Build attribute tree structure
export const buildAttributeTree = (
  scope: Element,
  prefix: string = 'data-custom',
): AttributeNode[] => {
  const tree: AttributeNode[] = [];
  const nodeMap = new Map<Element, AttributeNode>();

  // Build selectors for all walker attributes
  const entityAttr = getElbAttributeName(prefix);
  const actionAttr = getElbAttributeName(prefix, 'action', false);
  const contextAttr = getElbAttributeName(prefix, 'context', false);
  const globalsAttr = getElbAttributeName(prefix, 'globals', false);

  // Find all elements with walker attributes
  const allElements = Array.from(scope.querySelectorAll('*'));
  const walkerElements = allElements.filter((el) => {
    return Array.from(el.attributes).some(
      (attr) =>
        attr.name === entityAttr ||
        attr.name === actionAttr ||
        attr.name === contextAttr ||
        attr.name === globalsAttr ||
        attr.name.startsWith(`${prefix}-`),
    );
  });

  // Build nodes for each element
  walkerElements.forEach((el) => {
    if (nodeMap.has(el)) return; // Already processed

    const node: AttributeNode = {
      element: el.tagName.toLowerCase(),
      path: getElementPath(el),
      htmlMarkup: generateElementHTML(el),
      attributes: {},
      children: [],
    };

    // Collect all walker attributes on this element
    if (el.hasAttribute(entityAttr)) {
      node.attributes.entity = el.getAttribute(entityAttr) || '';
    }

    if (el.hasAttribute(actionAttr)) {
      node.attributes.action = el.getAttribute(actionAttr) || '';
    }

    try {
      const contextValues = getElbValues(prefix, el, 'context', false);
      if (Object.keys(contextValues).length > 0) {
        node.attributes.context = contextValues;
      }
    } catch (e) {
      // Skip context if parsing fails
    }

    try {
      const globalsValues = getElbValues(prefix, el, 'globals', false);
      if (Object.keys(globalsValues).length > 0) {
        node.attributes.globals = globalsValues;
      }
    } catch (e) {
      // Skip globals if parsing fails
    }

    // Collect property attributes
    const properties: WalkerOS.Properties = {};
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith(`${prefix}-`)) {
        const propName = attr.name.substring(prefix.length + 1);
        try {
          properties[propName] = getElbValues(prefix, el, propName, true);
        } catch (e) {
          // If parsing fails, just store the raw value
          properties[propName] = attr.value;
        }
      }
    });

    if (Object.keys(properties).length > 0) {
      node.attributes.properties = properties;
    }

    nodeMap.set(el, node);
  });

  // Build tree structure
  nodeMap.forEach((node, element) => {
    let parent = element.parentElement;
    let parentNode = null;

    // Find nearest parent with walker attributes
    while (parent && parent !== scope) {
      if (nodeMap.has(parent)) {
        parentNode = nodeMap.get(parent);
        break;
      }
      parent = parent.parentElement;
    }

    if (parentNode) {
      parentNode.children.push(node);
    } else {
      tree.push(node);
    }
  });

  return tree;
};
