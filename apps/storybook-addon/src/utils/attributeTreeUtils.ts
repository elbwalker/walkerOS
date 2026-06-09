// Builds an entity-centric "skeleton" tree: each node is a data-elb entity, with
// generic (data-elb-), scoped (data-elb_), and explicit (data-elb-<entity>)
// values resolved onto it and tagged by origin. Interim addon-local
// approximation of the walker's resolution (see the design doc for fidelity
// limits: cross-DOM links, shadow piercing, exact collision priority, and
// context ordering index are out of scope for Phase 1).

import type { WalkerOS } from '@walkeros/core';
import { Const } from '@walkeros/collector';
import {
  getElbValues,
  getElbAttributeName,
  getGlobals,
} from '@walkeros/web-source-browser';
import type { AttributeNode, ResolvedProperty } from '../types';
import { getElementPath } from './domUtils';

const generateElementHTML = (element: Element, prefix: string): string => {
  const tagName = element.tagName.toLowerCase();
  // Hide the synthetic highlight marker (data-elbproperty) that
  // enhanceProperties stamps on the live DOM; it is an internal helper, not
  // author-written tagging, so it must not appear in the displayed markup.
  const propertyMarker = getElbAttributeName(prefix, 'property', false);
  const attribs = Array.from(element.attributes)
    .filter((a) => a.name !== propertyMarker)
    .map((a) => `${a.name}="${a.value}"`);
  if (attribs.length === 0) return `<${tagName}></${tagName}>`;
  if (attribs.length === 1) return `<${tagName} ${attribs[0]}></${tagName}>`;
  return `<${tagName}\n${attribs.map((a) => `  ${a}`).join('\n')}\n></${tagName}>`;
};

// Origin priority for same-key collisions (highest first). Approximate; real
// walker priority is documented as out of scope for Phase 1.
const PRIORITY: Record<ResolvedProperty['origin'], number> = {
  data: 3,
  scoped: 2,
  generic: 1,
};

const addProperty = (
  acc: Map<string, ResolvedProperty>,
  key: string,
  value: WalkerOS.Property | undefined,
  origin: ResolvedProperty['origin'],
) => {
  if (!key) return; // never store the blank-key generic
  if (value === undefined || value === null || value === '') return;
  const existing = acc.get(key);
  if (!existing || PRIORITY[origin] > PRIORITY[existing.origin]) {
    acc.set(key, { key, value, origin });
  }
};

const collectValues = (
  acc: Map<string, ResolvedProperty>,
  prefix: string,
  el: Element,
  name: string, // '' for generic, entity name for explicit
  origin: ResolvedProperty['origin'],
) => {
  const values = getElbValues(prefix, el, name, true);
  Object.entries(values).forEach(([k, v]) => addProperty(acc, k, v, origin));
};

export const buildAttributeTree = (
  scope: Element,
  prefix: string = Const.Commands.Prefix,
): { nodes: AttributeNode[]; globals: ResolvedProperty[] } => {
  const entityAttr = getElbAttributeName(prefix); // data-elb
  const scopedName = Const.Commands.Scoped; // '_'

  // All entity elements (self + descendants).
  const entityEls: Element[] = [];
  if (scope.matches(`[${entityAttr}]`)) entityEls.push(scope);
  scope.querySelectorAll(`[${entityAttr}]`).forEach((el) => entityEls.push(el));
  const entitySet = new Set(entityEls);

  // Nearest ancestor-or-self entity for any element (DOM ancestry).
  const owningEntity = (el: Element): Element | null => {
    let cur: Element | null = el;
    while (cur) {
      if (entitySet.has(cur)) return cur;
      cur = cur.parentElement;
    }
    return null;
  };

  const nodeMap = new Map<Element, AttributeNode>();

  entityEls.forEach((el) => {
    const entity = el.getAttribute(entityAttr) || '';
    const props = new Map<string, ResolvedProperty>();

    // Own + owned descendants: explicit (data-elb-<entity>) and generic (data-elb-)
    const owned: Element[] = [el];
    el.querySelectorAll('*').forEach((child) => {
      if (owningEntity(child) === el) owned.push(child);
    });
    owned.forEach((o) => {
      collectValues(props, prefix, o, entity, 'data');
      collectValues(props, prefix, o, '', 'generic');
    });

    // Ancestors (incl. self start): explicit, generic, and scoped (data-elb_)
    let anc: Element | null = el;
    while (anc) {
      collectValues(props, prefix, anc, entity, 'data');
      collectValues(props, prefix, anc, '', 'generic');
      // scoped uses isProperty=false (suffix '_' with no dash)
      Object.entries(getElbValues(prefix, anc, scopedName, false)).forEach(
        ([k, v]) => addProperty(props, k, v, 'scoped'),
      );
      anc = anc.parentElement;
    }

    nodeMap.set(el, {
      element: el.tagName.toLowerCase(),
      path: getElementPath(el),
      htmlMarkup: generateElementHTML(el, prefix),
      attributes: {
        entity,
        action:
          el.getAttribute(
            getElbAttributeName(prefix, Const.Commands.Action, false),
          ) || undefined,
        context: (() => {
          const c = getElbValues(prefix, el, Const.Commands.Context, false);
          return Object.keys(c).length ? c : undefined;
        })(),
        globals: (() => {
          const g = getElbValues(prefix, el, Const.Commands.Globals, false);
          return Object.keys(g).length ? g : undefined;
        })(),
        properties: Array.from(props.values()),
      },
      children: [],
    });
  });

  // Nest by nearest ancestor entity.
  const roots: AttributeNode[] = [];
  nodeMap.forEach((node, el) => {
    const parentEl = el.parentElement ? owningEntity(el.parentElement) : null;
    const parentNode = parentEl ? nodeMap.get(parentEl) : undefined;
    if (parentNode) parentNode.children.push(node);
    else roots.push(node);
  });

  const globalsValues = getGlobals(prefix, scope);
  const globals: ResolvedProperty[] = [];
  Object.entries(globalsValues).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '')
      globals.push({ key, value, origin: 'data' });
  });

  return { nodes: roots, globals };
};
