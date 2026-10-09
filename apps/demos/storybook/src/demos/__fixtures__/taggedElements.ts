/** Every element under `root` that carries a `data-elb*` attribute. */
export function taggedElements(root: Element): Element[] {
  return Array.from(root.querySelectorAll('*')).filter((element) =>
    element.getAttributeNames().some((name) => name.startsWith('data-elb')),
  );
}
