<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/explorer

Interactive React components for walkerOS documentation and exploration, with
live code editing and event visualization.

[Documentation](https://www.walkeros.io/docs) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/explorer) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/apps/explorer)

## Installation

```bash
npm install @walkeros/explorer
```

## Quick start

Import the design tokens once per page, then explorer's styles and a component:

```tsx
import '@walkeros/explorer/design/tokens.css';
import '@walkeros/explorer/styles.css';
import { CodeBox } from '@walkeros/explorer';

<CodeBox code={'{ "name": "page view" }'} language="json" label="Event" />;
```

In a Tailwind v4 build, import `@walkeros/explorer/design/tailwind.css` after
`@import "tailwindcss"` instead of `tokens.css`: it brings the tokens, a utility
for every design colour and type style, `max-w-*` widths in px and `transition`
utilities on the design motion. `@walkeros/explorer/design/base.css` adds
optional page-wide base rules (font, colours, focus ring, selection).

## Themes

Set `data-theme="dark"` (the default) or `data-theme="light"` on the page root.
Code surfaces (`CodeBox`, `CodeView`, `Code`, the preview) stay dark in both
themes. Monaco uses one code theme; `Code` and `CodeBox` register it themselves.
A Monaco editor of your own registers it with:

```ts
import { registerTheme, ELB_THEME_DARK } from '@walkeros/explorer';

registerTheme(monaco);
monaco.editor.setTheme(ELB_THEME_DARK);
```

## Design system

Explorer ships the walkerOS design system:

| Import                                   | What                                                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `@walkeros/explorer/design/tokens.css`   | The design tokens as CSS custom properties                                                                                   |
| `@walkeros/explorer/design/tailwind.css` | The tokens as a Tailwind v4 theme                                                                                            |
| `@walkeros/explorer/design/base.css`     | Optional base rules for a whole page                                                                                         |
| `@walkeros/explorer/design`              | The token values as constants (colours, fonts, type styles, motion), for code that cannot read CSS variables                 |
| `@walkeros/explorer/design/components`   | React building blocks of walkerOS pages (`Button`, `InlineCode`, `EventLegend` and more), with no Monaco or walkerOS runtime |

The `walkeros-design-check` command checks a package's own styles against the
design system.

## Documentation

Full component reference, styling, and examples live in the docs:
**https://www.walkeros.io/docs**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
