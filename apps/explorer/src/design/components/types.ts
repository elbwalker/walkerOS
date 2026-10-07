import type { AnchorHTMLAttributes, ComponentType, ReactNode } from 'react';

/** Tagging and test attributes passed through to an element (`data-alst*`, `data-elb*`). */
export type DataAttributes = Record<`data-${string}`, string>;

/** A client-side router link (a Docusaurus or Next `Link`) rendered instead of `<a>`. */
export type LinkComponent = ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement>
>;

/** A call to action inside a component: its label, its target and its own tagging. */
export interface CallToAction {
  label: ReactNode;
  href: string;
  attributes?: DataAttributes;
}
