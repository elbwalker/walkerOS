The walkerOS call-to-action: a `primary` fill with `on-primary` text, or a flat `surface` secondary.

16px/600, 12×24 padding, `radius-md`. Primary brightens on hover; secondary turns its `border` to `primary`. Use at most one primary per group; it leads. Add `arrow` for forward-moving CTAs ("Set up with your agent →").

**Consumer provides:** `children`, `href` (renders a link) or `onClick`, `variant` ('primary' | 'secondary'), optional `arrow`, `block` (full width inside cards).

- Don't: white text on `primary`, ghost/outline variants in brand blue, icons other than the arrow.
