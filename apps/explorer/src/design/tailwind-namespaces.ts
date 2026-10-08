/**
 * Tailwind 4.3's own custom properties (tailwindcss/theme.css), listed once
 * for the bridge (design/tailwind.css), the token guard and
 * walkeros-design-check.
 */

/** Theme namespaces the bridge empties, so only design tokens produce these utilities. */
export const TAILWIND_RESET_NAMESPACES = [
  'color',
  'radius',
  'container',
  'font',
  'text',
  'shadow',
  'inset-shadow',
  'drop-shadow',
  'text-shadow',
] as const;

/** Theme namespaces the bridge keeps with Tailwind's own values. */
export const TAILWIND_KEPT_NAMESPACES = [
  'animate',
  'aspect',
  'blur',
  'breakpoint',
  'default',
  'ease',
  'font-weight',
  'leading',
  'max-width',
  'perspective',
  'tracking',
] as const;

/** Tailwind's runtime `--tw-*` variables and its `--spacing-*` scale. */
const TAILWIND_OTHER_NAMESPACES = ['tw', 'spacing'] as const;

/**
 * Keys Tailwind keeps apart from the `--text-*` sizes and `--font-*` families
 * (tailwindcss dist/lib.js), beside `text-shadow` and `font-weight` above.
 */
const TAILWIND_NESTED_NAMESPACES = [
  'text-color',
  'text-decoration-color',
  'text-decoration-thickness',
  'text-indent',
  'text-underline-offset',
  'font-size',
] as const;

const TAILWIND_NAMESPACES: readonly string[] = [
  ...TAILWIND_RESET_NAMESPACES,
  ...TAILWIND_KEPT_NAMESPACES,
  ...TAILWIND_OTHER_NAMESPACES,
  ...TAILWIND_NESTED_NAMESPACES,
];

/** Single variables: `--spacing` (the bridge sets it to 4px) and the deprecated `--blur`, `--shadow`, `--drop-shadow`, `--radius`. */
const TAILWIND_BARE_VARIABLES: readonly string[] = [
  'spacing',
  'blur',
  'shadow',
  'drop-shadow',
  'radius',
];

/**
 * Variable prefixes walkeros-design-check accepts as Tailwind's own, beside
 * the design names: `tw-` and every namespace the bridge keeps.
 */
export const TAILWIND_VARIABLES: readonly string[] = [
  'tw-',
  ...TAILWIND_KEPT_NAMESPACES.map((namespace) => `${namespace}-`),
];

/** A namespace nested in another (`text-indent` in `text`): Tailwind keeps its own name apart too. */
const isNested = (namespace: string): boolean =>
  TAILWIND_NAMESPACES.some(
    (parent) => parent !== namespace && namespace.startsWith(`${parent}-`),
  );

/**
 * The Tailwind namespace a custom property `--<name>` falls in, the most
 * specific one (`font-weight` before `font`); undefined when Tailwind does
 * not use the name.
 */
export function tailwindNamespace(name: string): string | undefined {
  let found: string | undefined;
  for (const namespace of TAILWIND_NAMESPACES) {
    const inside =
      name.startsWith(`${namespace}-`) ||
      (name === namespace &&
        (TAILWIND_BARE_VARIABLES.includes(namespace) || isNested(namespace)));
    if (inside && (found === undefined || namespace.length > found.length)) {
      found = namespace;
    }
  }
  return found;
}
