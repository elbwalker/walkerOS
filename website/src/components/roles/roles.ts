export type RoleSlug =
  | 'tracking-specialists'
  | 'developers'
  | 'data-analysts'
  | 'data-leads';

export interface RoleCard {
  slug: RoleSlug;
  title: string;
  text: string;
}

export const roles: RoleCard[] = [
  {
    slug: 'tracking-specialists',
    title: 'Tracking specialists',
    text: 'Coming from GTM & GA4: a direct translation',
  },
  {
    slug: 'developers',
    title: 'Developers',
    text: 'API, types, and how the pipeline is actually built',
  },
  {
    slug: 'data-analysts',
    title: 'Data analysts',
    text: 'Trustworthy events, from the warehouse backward',
  },
  {
    slug: 'data-leads',
    title: 'Data leads',
    text: 'One schema that survives the handoff between silos',
  },
];

export function roleHref(slug: RoleSlug): string {
  return `/for/${slug}/`;
}

export interface RoleLink {
  label: string;
  href: string;
}

export interface RoleSituation {
  /** The reader's broken thing, in their words. */
  claim: string;
  /** What changes with walkerOS, with a mechanism the reader can check. */
  witness: string;
}

export interface RoleChange {
  kicker: string;
  headline: string;
  body: string;
  /** A real, working snippet from the documented public API. */
  code: string;
  caption: string;
}

export interface RoleQuestion {
  question: string;
  answer: string;
}

export interface RoleNextLink {
  label: string;
  href: string;
  note: string;
}

/**
 * Copy for one role page. Strings support two inline forms:
 * `code` in backticks and [label](/path) links.
 */
export interface RoleContent {
  slug: RoleSlug;
  meta: { title: string; description: string };
  hero: {
    headline: string;
    lede: string;
    primary: RoleLink;
    secondary: RoleLink;
  };
  situations: { headline: string; items: RoleSituation[] };
  changes: RoleChange[];
  fit: {
    headline: string;
    stays: string[];
    changes: string[];
    firstStep: string;
  };
  limits: string[];
  questions: RoleQuestion[];
  next: { headline: string; links: RoleNextLink[] };
}
