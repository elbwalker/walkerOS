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

export function isVisible(
  element: HTMLElement,
  win: Window,
  doc: Document,
): boolean {
  // Check for hiding styles
  const style = win.getComputedStyle(element);
  if (style.display === 'none') return false;
  if (style.visibility !== 'visible') return false;
  if (style.opacity && Number(style.opacity) < 0.1) return false;

  // Window positions
  const windowHeight = win.innerHeight; // Height of the viewport

  // Element positions
  const elemRectRel = element.getBoundingClientRect(); // Get the elements relative to the viewport
  const elementHeight = elemRectRel.height; // Height of the element
  const elementTopRel = elemRectRel.y; // Relative distance from window top to element top
  const elementBottomRel = elementTopRel + elementHeight; // Relative distance from window to to element bottom
  const elemCenterRel = {
    // Relative position on viewport of the elements center
    x: elemRectRel.x + element.offsetWidth / 2,
    y: elemRectRel.y + element.offsetHeight / 2,
  };

  // Point to probe for the topmost element
  let pointX: number;
  let pointY: number;

  // Differentiate between small and large elements
  if (elementHeight <= windowHeight) {
    // Smaller than the viewport

    // Must have a width and height
    if (
      element.offsetWidth + elemRectRel.width === 0 ||
      element.offsetHeight + elemRectRel.height === 0
    )
      return false;

    if (elemCenterRel.x < 0) return false;
    if (elemCenterRel.x > (doc.documentElement.clientWidth || win.innerWidth))
      return false;
    if (elemCenterRel.y < 0) return false;
    if (elemCenterRel.y > (doc.documentElement.clientHeight || win.innerHeight))
      return false;

    // Probe the center of the target
    pointX = elemCenterRel.x;
    pointY = elemCenterRel.y;
  } else {
    // Bigger than the viewport

    // that are considered visible if they fill half of the screen
    const viewportCenter = windowHeight / 2;

    // Check if upper part is above the viewports center
    if (elementTopRel < 0 && elementBottomRel < viewportCenter) return false;

    // Check if lower part is below the viewports center
    if (elementBottomRel > windowHeight && elementTopRel > viewportCenter)
      return false;

    // Probe the middle of the screen
    pointX = elemCenterRel.x;
    pointY = windowHeight / 2;
  }

  // Resolve the topmost element at the point, piercing shadow boundaries
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
