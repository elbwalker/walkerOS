The walkerOS call-to-action: a `primary` fill with `on-primary` text, or a flat `surface` secondary.

16px/600, 12×24 padding, `radius-md`. Primary brightens on hover; secondary turns its `border` to `primary`. Use at most one primary per group; it leads. Add `arrow` for forward-moving CTAs ("Set up with your agent →").

**Consumer provides:** `children`, `href` (renders a link) or `onClick`, `variant` ('primary' | 'secondary'), optional `arrow`, `block` (full width inside cards).

- Don't: white text on `primary`, ghost/outline variants in brand blue, icons other than the arrow.

**Additions in code** (`@walkeros/explorer/design/components`; the artifact follows at the next sync):

- Every other HTML attribute reaches the rendered `<a>` or `<button>`: `data-elb*` tagging, `aria-*`, `onClick`, `type` (default `button`). Tagged CTAs keep tracking.
- `linkComponent` (with `href`): a client-side router link, such as Docusaurus or Next `Link`, rendered instead of `<a>` with the same `href`, `className`, children and attributes.
