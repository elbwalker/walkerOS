---
'@walkeros/explorer': patch
---

The `PromotionPlayground` and `LiveCode` mapping examples show events and
results again, and every failure says so in the box it concerns. `Preview` takes
a `collector` instead of `elb` and captures the page's events through it; its
document carries the design tokens, base rules and design atom styles, so the
demo product card is built from `Card`, `PhotoPlaceholder`, `Text` and `Button`.
The Playground drops its separate Code box and the `labelCode` prop: the
Preview's HTML, CSS and JS tabs edit the page. New props: `placeholder` and
`error` on `CodeBox`, `error` on `Box`, `boxWidth` on `Grid` for one row of
fixed-width boxes.
