walkerOS is an open-source event data collection platform by elbwalker. This system follows the landing-page relaunch: a dark-first, developer-facing site where one blue carries the brand and everything else is ink, hairlines and code. Build every walkerOS surface from these tokens and the `WalkerOS` components.

## Voice and copy

- **Speak to engineers, plainly.** Short declarative sentences, no hype. Name the real mechanism: "`data-elb` attributes live in the markup itself", not "seamless tracking".
- **Contrast the usual way with the walkerOS way.** Feature copy is two paragraphs that start with bold labels: **The usual way:** … **The walkerOS way:** …
- **Headlines state an outcome in two beats.** "Tag a component once. Every instance is tracked, forever." · "Instrument once. Every vendor is a mapping, not a rewrite."
- **Eyebrows name the problem the section answers**, in sentence case, rendered uppercase: "Because event instrumentation is real engineering effort", "The vendor becomes a destination".
- **Be honest about trade-offs.** The FAQ concedes where competitors are good ("Honest caveat: GTM genuinely solves fan-out well enough…"). Keep that.
- Sentence case everywhere except eyebrows and tier labels. "we" = elbwalker, "you" = the reader's team. No emoji. Use the product's own nouns: *source, destination, mapping, transformer, flow, collector, entity action event*.
- Write **walkerOS** (lowercase w, uppercase OS) and **elbwalker** (all lowercase). Commands are real and copyable: `npm i -g @walkeros/cli`.
- Arrows `→` close link-style CTAs ("Docs →", "Set up with your agent →"). Use the middle dot `·` to join short facts.

## Color

- Dark is the default theme (walkeros.io and the relaunch open dark); light is a full peer. Every token is per theme: never hard-code a hex.
- Grounds: `bg` for the page, `bg-2` for every alternate section band and the footer, `surface` for cards on either, `surface-2` for inline code and hover fills. Separate sections with a 1px `border` top rule, not with shadow.
- Text: `fg` for headings and body, `fg-2` for supporting copy, `fg-3` only for meta (tier labels, `$` prompt, copyright).
- `primary` (#01b5e2, elbwalker blue) is the only brand hue. Spend it on: the primary CTA fill, check icons, the highlighted phrase of the H1, the announcement bar, the focus ring and the recommended plan's border. Text on `primary` is always `on-primary`, never white.
- Links, eyebrows and step numbers use `link`, which is tuned per theme (lighter in dark, deeper in light).
- `glow` is the only atmospheric effect: one radial halo behind the hero and the 4px ring (`plan-highlight`) on the recommended plan. No gradients beyond that, no blue-purple.
- **Event palette.** The five parts of a walkerOS event have fixed colours wherever events are visualised or syntax-highlighted: `event-entity` green, `event-action` purple, `event-property` red, `event-context` orange, `event-globals` light blue. Always pair the colour with its word (legend chip + label); never use these hues for UI states.
- Code and product visualisations stay dark in both themes: `code-*` for code blocks, `viz-*` for the interactive demos.
- Contrast: every text token reads at 4.5:1 or more on the grounds its usage note names, in both themes; borders that mark controls, the focus ring, step, chart and annotation colours reach 3:1. Light `primary` is 2.2 to 2.4:1 on light grounds, so in light it is a fill under `on-primary`, never text or a lone marker; `focus` and `chart-1` take `link` there.

## Typography

- Site UI is set in the system stack (`sans`) with `mono` for commands and code: the same stacks the Docusaurus docs use, so marketing and docs feel like one product.
- Product visualisations use **Geist** and **Geist Mono** (`viz`, `viz-mono`, Google Fonts) to read as product UI inside the page.
- Headings are bold (700) with tight negative tracking (`display` −0.025em, `heading-lg` −0.02em) and `text-wrap: balance`. All display and heading sizes are fluid `clamp()` values; the token holds the max.
- Body is 16px / 1.65 (`body`); explainers 17px (`body-lg`); leads 18–21px (`lead`) in `fg-2`, max ~58ch.
- `eyebrow`: 13px / 600 / 0.12em / uppercase in `link`, always directly above a heading. `label`: 12px / 700 / 0.12em / uppercase in `fg-3`.
- Inline code: `code-inline` (mono, 0.88em) on `surface-2` with a `border` outline and `radius-sm`.

## Layout and spacing

- Content sits in a `container` (1240px) with `gutter` (24px) side padding. Sections pad `section-y` (88px) top and bottom; the hero opens with 104px.
- Section heading block: eyebrow → H2 → optional lead, max 760px wide, `heading-gap` (44px) before content.
- Grids are fluid `auto-fit` with a min column (280px problem cards, 300px plan cards and feature items, 420px split columns), gap `space-5` (20px) for cards, `split-gap` (64px) between heading and explainer columns.
- Stacked feature blocks are `feature-gap` (96px) apart with a `border` rule between.
- Header: sticky, `header-h` (60px), `bg` at 88% with an 8px backdrop blur and a bottom `border`.

## Shape, borders, elevation

- Corners: `radius-md` 8px for buttons and the install chip, `radius-faq` 10px for FAQ items, `radius-lg` 12px for cards, `radius-xl` 16px for visualisation frames, `radius-full` for pills.
- Cards are flat: `surface` + 1px `border`. Hover tints the border toward `primary` (50% mix); nothing lifts or scales.
- No drop shadows. The only shadow token is `plan-highlight`, used once per page.

## Interaction

- Primary button: `primary` fill, `on-primary` text, brightens slightly on hover (`brightness(1.08)`).
- Secondary button: `surface` fill, `border` outline, `fg` text; border turns `primary` on hover.
- Links: `link`, underline on hover only.
- Focus: 2px solid `focus` outline (`primary` in dark, `link` in light), 3px offset, `radius-xs`, on every interactive element.
- Transitions use `--motion` (180ms) and `--ease` from `tokens.css`, never another duration or easing; Tailwind's `transition` utilities read both by default. Reduced motion sets `--motion` to 0, and `base.css` also stops animations, transitions with their own durations and smooth scrolling.

## Product UI

The app, the explorer and Tag Mode use these tokens with a few more rules.

- **Type.** Set product text in the `Product` group: `product-body` (14px) for body copy, forms and tables, `product-small` for secondary rows, `product-caption` for meta and badges, `product-micro` (11px) only for dense canvas labels such as node badges, edge labels and mark labels (never body copy, never interactive text), `product-title` and `product-heading` for panel and page titles. Every text size is one of the type styles, and every font is `sans`, `mono`, `viz` or `viz-mono`. The marketing styles above stay on walkeros.io. Where CSS variables cannot reach, such as email HTML, styles injected by script and editor options, read the generated constants from `@walkeros/explorer/design`: `typeProductBody` and the other `type*` styles, `motion` and `ease`.
- **Widths.** Dialogs, panels and page columns take the `container-*` widths, `container-3xs` (256px) to `container-7xl` (1280px). They are px, so a page's root font size never re-sizes a dialog or a Tag Mode panel.
- **Controls.** Outline inputs, selects, checkboxes and switch tracks with `border-strong`; `border` stays decorative. Inputs fill with `bg`, placeholders use `fg-3`, invalid fields `danger`. One `primary` button per view.
- **Layers.** Menus, popovers, dialogs and panels are `surface` with a 1px `border-strong` edge and no shadow. Modal scrims use `backdrop`. Stack layers with the `z-*` tokens, never a raw number.
- **Status.** `danger`, `success`, `warning` and `info` always come with an icon and a word. On a tinted `*-bg` fill the text is `fg`; the status colour marks the icon and the border. `success` sits on the blue side of green so it stays apart from `danger` with red-green colour blindness. Any other state a hue tells (seen, not seen yet, added, removed) also gets a cue without colour, an edge style, a glyph or a shape, and its word: visible where it fits, otherwise in the tooltip and the accessible name.
- **Flow steps.** `step-source`, `step-transformer`, `step-collector`, `step-destination` and `step-store` colour step badges, node accents and edges; `platform-web` and `platform-server` mark platforms. Always beside the word.
- **Charts and notes.** Series take `chart-1` to `chart-6` in order, each labelled. `annotation` marks human notes and comment pins.
- **Tag kinds.** `event-user` and `event-consent` join the five event parts on the same terms: dark grounds only, always with their word. On light chrome, a key in an event colour (a tool button, a picker tile, a kind label) sits on a small dark island of its own.
- **Editors.** Monaco, Shiki and Prism use `syntax-*` on `code-bg`, with `code-line-number`, `code-selection`, `code-inserted-bg` and `code-deleted-bg`. Visualisations keep `viz-*`. Code surfaces stay dark in both themes.
- **Tailwind.** `tokens.css` declares `--radius-*`, `--font-sans` and `--font-mono` under Tailwind's own names, so importing it alone already re-scales Tailwind's `rounded-*` (`rounded-lg` becomes 12px) and re-fonts `font-sans` and `font-mono`. Move radius classes to the design scale in the same change (`rounded-lg` to `rounded-md`, `rounded-xl` to `rounded-lg`). `tailwind.css` then removes the palette, the default radii, sizes and shadows, and maps `max-w-*` to the `container-*` widths.

## Iconography

- Icons are simple 2px-stroke line glyphs with round caps, drawn in `currentColor`: the check (`M3 8.5l3 3 7-7` on a 16 grid), copy, sun/moon for the theme toggle. Check icons are always `primary`.
- Source and destination logos on walkeros.io come from Iconify sets (`logos:*`, `simple-icons:*`, `mdi:*`) via the `@walkeros/explorer` Icon component.
- The walkerOS mark is three slanted bars; never redraw it; use `walkerOS-mark.svg` or `walkerOS-logo.svg` from Logos.

## Components

`AnnouncementBar`, `SiteHeader`, `Button`, `InstallCommand`, `CheckList`, `SectionHeading`, `ProblemCard`, `FeatureItem`, `PlanCard`, `FaqItem`, `InlineCode`, `EventLegend`, `SiteFooter`. Each card below states what it needs. They are hand-written from the relaunch design and paint only with these tokens.

Three product visualisations show the mechanism instead of describing it: `HeroTaggingViz` under the hero, `ArticleTeaserTracking` in the tagging feature, `DestinationMappingViz` in the mapping feature. Place each full container width directly below its feature's heading/explainer row, 40px gap. They stay dark in both themes, use Geist, and colour every event part with its `event-*` token; syntax uses `viz-tag`, `viz-string`, `viz-number`, `viz-punct`. Give animated ones a static frame (`playing={false}` / `autoplay={false}` with a start point) when the viewer prefers reduced motion.

## Not synced

- The Bundled / Integrated / MCP setup tabs are not rebuilt as a component.
- Font files: Geist and Geist Mono load from Google Fonts; the site stacks are system fonts, so none are stored.
- `@walkeros/explorer` components (ArchitectureFlow, CodeBox) used on the live site are not included.
