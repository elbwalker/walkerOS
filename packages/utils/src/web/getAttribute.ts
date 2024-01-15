export function getAttribute(element: Element, name: string): string {
  return element.getAttribute(name) || '';
}
