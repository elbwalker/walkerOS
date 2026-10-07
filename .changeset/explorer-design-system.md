---
'@walkeros/explorer': minor
---

Explorer now ships the walkerOS design system. Import
`@walkeros/explorer/design/tokens.css` for colour, type, spacing, radius and
layer tokens (dark by default, light under `data-theme="light"`), the opt-in
`design/base.css`, the Tailwind v4 bridge `design/tailwind.css`, and typed
colour and font constants from `@walkeros/explorer/design`. A
`walkeros-design-check` command lints consuming code. Existing exports are
unchanged.
