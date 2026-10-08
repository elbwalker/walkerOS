---
'@walkeros/explorer': patch
---

Explorer components now read the walkerOS design tokens: import
`@walkeros/explorer/design/tokens.css` beside `styles.css`. The old theme
variables (`--bg-box`, `--color-text` and the rest) are removed. Code panels are
dark in both page themes. Removed exports: `lighthouseTheme`,
`registerLighthouseTheme`, `palenightTheme`, `registerPalenightTheme`, type
`ExplorerTheme`, and `registerAllThemes`, replaced by `registerTheme`.
`ELB_THEME_DARK` is now exported.
