/**
 * Resolve the topmost element at a point, descending into shadow trees.
 * `elementFromPoint` does not pierce shadow boundaries, so this re-probes each
 * open shadow root's own `elementFromPoint`. It descends through open roots and
 * stops at a closed host, whose `shadowRoot` is null.
 * @param root - Document or shadow root to probe from
 * @param x - Viewport x coordinate
 * @param y - Viewport y coordinate
 * @returns Deepest element at the point, or null when nothing is hit
 */
export function deepElementFromPoint(
  root: DocumentOrShadowRoot,
  x: number,
  y: number,
): Element | null {
  let el = root.elementFromPoint(x, y);
  while (el && el.shadowRoot) {
    const inner = el.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === el) break;
    el = inner;
  }
  return el;
}

/**
 * Collect the composed ancestor chain of an element, walking `parentElement`
 * and hopping across shadow-host boundaries when a shadow root is reached.
 * Ancestry follows the flattened tree by DOM containment; it does not resolve
 * slot distribution (slotted light-DOM parents are not tracked).
 * @param node - Element to walk up from
 * @param win - Window owning the element, used for its realm's ShadowRoot
 * @returns Ancestors from nearest to furthest
 */
export function composedAncestors(node: Element, win: Window): Element[] {
  const chain: Element[] = [];
  let current: Element | null = node;
  while (current) {
    let parent: Element | null = current.parentElement;
    if (!parent) {
      const root = current.getRootNode();
      // `win.self` is load-bearing: the ShadowRoot constructor lives on
      // `Window & typeof globalThis` (the type of `win.self`), not the bare
      // `Window` parameter, so `win.ShadowRoot` would fail typecheck.
      if (root instanceof win.self.ShadowRoot) parent = root.host;
    }
    if (!parent) break;
    chain.push(parent);
    current = parent;
  }
  return chain;
}

/**
 * Collect the shadow hosts enclosing an element, crossing only shadow-host
 * boundaries. Unlike composedAncestors, plain light-DOM parents are skipped, so
 * the result contains hosts alone, ordered from innermost to outermost.
 * @param node - Element to walk up from
 * @param win - Window owning the element, used for its realm's ShadowRoot
 * @returns Enclosing shadow hosts, innermost first
 */
export function shadowHostsAbove(node: Element, win: Window): Element[] {
  const hosts: Element[] = [];
  let root = node.getRootNode();
  // `win.self` is load-bearing: the ShadowRoot constructor lives on
  // `Window & typeof globalThis` (the type of `win.self`), not the bare
  // `Window` parameter, so `win.ShadowRoot` would fail typecheck.
  while (root instanceof win.self.ShadowRoot) {
    hosts.push(root.host);
    root = root.host.getRootNode();
  }
  return hosts;
}

/**
 * True when the composed chain renders the element at all. `visibility`
 * inherits, so the element's own computed value is enough. `opacity` does NOT
 * inherit: a transparent ancestor leaves the element's own opacity at 1 while
 * hiding it, and elementFromPoint does not help because a transparent element
 * is still hit-testable. Walk the chain, crossing shadow-host boundaries.
 */
function isRendered(element: HTMLElement, win: Window): boolean {
  const style = win.getComputedStyle(element);
  if (style.display === 'none') return false;
  if (style.visibility !== 'visible') return false;

  let current: Element | null = element;
  while (current) {
    const opacity = win.getComputedStyle(current).opacity;
    if (opacity && Number(opacity) < 0.1) return false;

    const parent: Element | null = current.parentElement;
    if (parent) {
      current = parent;
      continue;
    }
    const root = current.getRootNode();
    current = root instanceof win.self.ShadowRoot ? root.host : null;
  }

  return true;
}

/**
 * Whether the element is actually seen by the user: rendered, on screen, and
 * not painted over. Geometry (how much of it is showing) is decided by the
 * IntersectionObserver, which computes it during layout for free; this function
 * answers only the two questions the observer is blind to, so it runs once per
 * candidate impression rather than on every scroll frame.
 */
export function isVisible(
  element: HTMLElement,
  win: Window,
  doc: Document,
): boolean {
  if (!isRendered(element, win)) return false;

  const rect = element.getBoundingClientRect();
  const viewportWidth = doc.documentElement.clientWidth || win.innerWidth;
  const viewportHeight = doc.documentElement.clientHeight || win.innerHeight;

  // Clip the element against the viewport. Probing the centre of this visible
  // band, rather than the centre of the element, is what removes the need for a
  // separate large-element branch: an element taller than the viewport has its
  // own centre off screen, which the previous implementation read as hidden.
  const left = Math.max(rect.left, 0);
  const top = Math.max(rect.top, 0);
  const right = Math.min(rect.right, viewportWidth);
  const bottom = Math.min(rect.bottom, viewportHeight);
  if (right <= left || bottom <= top) return false;

  const pointX = (left + right) / 2;
  const pointY = (top + bottom) / 2;

  const hit = deepElementFromPoint(doc, pointX, pointY);
  if (!hit) return false;
  if (hit === element) return true;
  if (composedAncestors(hit, win).includes(element)) return true;
  // Clause 3 is deliberately shadowHostsAbove (shadow-host hops only), not a
  // general ancestor walk. A plain light-DOM ancestor returned by
  // elementFromPoint (target has pointer-events:none, a transparent center, or
  // is covered via stacking) must NOT count as visible; restricting to shadow
  // hosts preserves light-DOM occlusion. Do not merge this with clause 2.
  if (shadowHostsAbove(element, win).includes(hit)) return true;
  return false;
}
