---
'@walkeros/explorer': patch
---

`@walkeros/explorer/design/tokens.css` now declares every type style as CSS
variables: `--type-<style>-size`, `-line-height`, `-weight`, `-family` and, when
the style sets one, `-tracking`. Components can take sizes and weights from the
design system instead of fixed values.
