/* walkerOS design constants, generated from design/tokens.json by src/design/generate.ts. Edit the JSON and run the explorer build, never this file. */

export type Theme = 'dark' | 'light';

/** Page background (hero, features, FAQ, closing CTA). Default ground for `fg`, `fg-2`, `link`. */
export const bg = { dark: "#111827", light: "#ffffff" } as const;

/** Alternating section band (Why, More features, Plans) and footer. Switch between `bg` and `bg-2` to separate sections, always with a top `border` rule. */
export const bg2 = { dark: "#151e2e", light: "#f6f7f9" } as const;

/** Cards, plan tiers, FAQ items, the install-command chip and secondary buttons. */
export const surface = { dark: "#1a2232", light: "#ffffff" } as const;

/** Inline code background, icon-button hover. */
export const surface2 = { dark: "#222b3c", light: "#f1f3f6" } as const;

/** Hairline for section rules, header underline, card and input outlines. Decorative only; it does not meet 3:1, so never rely on it alone to mark a control. */
export const border = { dark: "#2f3a4d", light: "#e3e6eb" } as const;

/** Headings and body copy on `bg`, `bg-2`, `surface`, `surface-2` (14:1+ both themes). */
export const fg = { dark: "#ffffff", light: "#111827" } as const;

/** Secondary copy: leads, card descriptions, list items, footer links. 5.5:1+ on every ground. */
export const fg2 = { dark: "#9aa3b2", light: "#4b5563" } as const;

/** Tertiary text: tier labels, `$` prompt, FAQ `+`, copyright, input placeholders. 4.5:1 or more on `bg`, `bg-2`, `surface` and `surface-2` in both themes (dark 4.6:1+, light 4.7:1+). */
export const fg3 = { dark: "#8c93a2", light: "#656d7a" } as const;

/** elbwalker blue. Primary button fill, check icons, highlight word in the H1, focus ring, announcement bar. Light theme: 2.4:1 on white — fine as a fill under `on-primary`, too faint for text or as the only marker (flagged, kept from source). */
export const primary = { dark: "#01b5e2", light: "#01b5e2" } as const;

/** Text and icons on `primary` fills (6.9:1). Never put white on `primary` (2.4:1) — the current walkeros.io buttons do; the relaunch fixes it. */
export const onPrimary = { dark: "#04222b", light: "#04222b" } as const;

/** Links, eyebrows, mono step numbers; `info` and the light `focus` ring use it. 4.5:1 or more on `bg`, `bg-2`, `surface` and `surface-2` in both themes (dark 6.0:1+, light 4.6:1+). Underline on hover only. */
export const link = { dark: "#4fb3e0", light: "#0076a0" } as const;

/** Soft primary halo: hero radial glow and the 4px ring around the highlighted plan. */
export const glow = { dark: "rgba(1, 181, 226, 0.16)", light: "rgba(1, 181, 226, 0.14)" } as const;

/** Code-block panel (Palenight family), both themes. */
export const codeBg = "#292d3e";

/** Code-block title bar / tab strip. */
export const codeBar = "#232636";

/** Code-block outline. */
export const codeBorder = "#444a5e";

/** Default code text on `code-bg` (8:1). */
export const codeFg = "#bfc7d5";

/** Product visualisation panel (tagging and mapping demos). Visualisations stay dark in both themes. */
export const vizBg = "#1a2232";

/** Code pane inside a visualisation. */
export const vizCodeBg = "#131c2b";

/** Outlines inside visualisations. */
export const vizBorder = "#334055";

/** Primary text inside visualisations. */
export const vizFg = "#e8eaf0";

/** Legend and meta text inside visualisations (5.4:1 on `viz-code-bg`). */
export const vizFg2 = "#8e96aa";

/** Code comments and file kinds inside visualisations. */
export const vizComment = "#6c7590";

/** Gutter line numbers. Decorative, below 3:1. */
export const vizLineNumber = "#4a5165";

/** Raised surfaces inside visualisations: the rendered teaser card, table rules. */
export const vizSurface = "#2b3649";

/** Syntax: HTML/JSX tag names in visualisation code (6:1+ on `viz-code-bg`). */
export const vizTag = "#e38fd6";

/** Syntax: string values in visualisation code and JSON cells. */
export const vizString = "#e5c07b";

/** Syntax: numbers and booleans in mapping code. */
export const vizNumber = "#f78c6c";

/** Syntax: punctuation and plain code text; visualisation captions. */
export const vizPunct = "#9aa3b8";

/** Event part: entity (e.g. `product`). Used for syntax highlight, legend chip and the highlighted DOM region in tagging demos. The dark value is for dark grounds (islands, visualisations, mark layers); the light value reads 4.5:1 or more as text on `bg`, `bg-2`, `surface` and `surface-2`. */
export const eventEntity = { dark: "#c5e478", light: "#537a01" } as const;

/** Event part: action (e.g. `view`, `add`). The dark value is for dark grounds (islands, visualisations, mark layers); the light value reads 4.5:1 or more as text on `bg`, `bg-2`, `surface` and `surface-2`. */
export const eventAction = { dark: "#c792ea", light: "#8c59ac" } as const;

/** Event part: entity property (`data-elb-product="name"`). The dark value is for dark grounds (islands, visualisations, mark layers); the light value reads 4.5:1 or more as text on `bg`, `bg-2`, `surface` and `surface-2`. */
export const eventProperty = { dark: "#f0717f", light: "#be4456" } as const;

/** Event part: context. The dark value is for dark grounds (islands, visualisations, mark layers); the light value reads 4.5:1 or more as text on `bg`, `bg-2`, `surface` and `surface-2`. */
export const eventContext = { dark: "#f2a65a", light: "#a25f06" } as const;

/** Event part: globals. The dark value is for dark grounds (islands, visualisations, mark layers); the light value reads 4.5:1 or more as text on `bg`, `bg-2`, `surface` and `surface-2`. */
export const eventGlobals = { dark: "#7fc4ea", light: "#317699" } as const;

/** Tag kind: user (who the visitor is). Unlike the five event parts it has no light value: it sits only on dark grounds (`viz-bg`, legends, chips, mark layers) and always pairs with its word. 5.2:1 on `viz-bg`; kept apart from `event-property`, `event-action` and `danger`. */
export const eventUser = "#e65fc4";

/** Tag kind: consent (consent states and requirements). Dark grounds only, always with its word. 10.7:1 on `viz-bg`. */
export const eventConsent = "#cbd5e1";

/** Brand scale (walkeros.io docs). Light-theme badge and admonition background. */
export const elbwalker100 = "#edfeff";

/** Brand scale. Admonition highlight (light). */
export const elbwalker200 = "#abf8ff";

/** Brand scale. Admonition text (dark). */
export const elbwalker300 = "#69ecfe";

/** Brand scale. */
export const elbwalker400 = "#27dbfe";

/** Brand scale anchor = `primary`. Admonition border. */
export const elbwalker500 = "#01b5e2";

/** Brand scale. Badge text (light), badge fill (dark). */
export const elbwalker700 = "#015372";

/** Brand scale. Admonition background (dark). */
export const elbwalker800 = "#00283a";

/** Brand scale, darkest step. */
export const elbwalker900 = "#000203";

/** Borders that mark a control: input, select, checkbox and switch outlines, the 1px edge of menus, popovers and dialogs, scrollbar thumbs, flow edges. 3:1 or more on `bg`, `bg-2`, `surface` and `surface-2` in both themes; `border` stays decorative. */
export const borderStrong = { dark: "#6b778d", light: "#818a9a" } as const;

/** Focus ring, 2px solid with a 3px offset, on every interactive element: `primary` in dark, `link` in light, where `primary` is 2.2:1. 3:1 or more on every ground. */
export const focus = { dark: "#01b5e2", light: "#0076a0" } as const;

/** Scrim behind modals and drawers. The layer above it is `surface` with a 1px `border-strong` edge, never a shadow. */
export const backdrop = { dark: "rgba(3, 7, 18, 0.72)", light: "rgba(17, 24, 39, 0.4)" } as const;

/** Errors, destructive actions and invalid fields, always with an icon and a word. Text at 4.5:1 or more on `bg`, `bg-2`, `surface` and `surface-2` in both themes. Kept apart from every event and step colour, `event-property` included. */
export const danger = { dark: "#ffa4ac", light: "#b91c1c" } as const;

/** Text and icons on a `danger` fill such as a destructive button (dark 8.6:1, light 6.5:1). */
export const onDanger = { dark: "#450a0a", light: "#ffffff" } as const;

/** Success and healthy states, always with an icon and a word. Sits on the blue side of green, so it stays apart from `danger` with red-green colour blindness, and apart from every step and event colour. Text at 4.5:1 or more on every ground. */
export const success = { dark: "#8cf9ff", light: "#07675d" } as const;

/** Warnings and states that need attention, always with an icon and a word. Kept apart from `step-transformer` and `event-context`. Text at 4.5:1 or more on every ground. */
export const warning = { dark: "#cabb00", light: "#886000" } as const;

/** Neutral information, always with an icon and a word. The `link` colour in both themes. */
export const info = { dark: "#4fb3e0", light: "#0076a0" } as const;

/** Tinted fill for danger banners and badges. Text on it is `fg`; the status colour marks the icon and the border (3:1 or more on the tint). */
export const dangerBg = { dark: "rgba(255, 164, 172, 0.16)", light: "rgba(185, 28, 28, 0.1)" } as const;

/** Tinted fill for success banners and badges. Text on it is `fg`; the status colour marks the icon and the border (3:1 or more on the tint). */
export const successBg = { dark: "rgba(140, 249, 255, 0.16)", light: "rgba(7, 103, 93, 0.1)" } as const;

/** Tinted fill for warning banners and badges. Text on it is `fg`; the status colour marks the icon and the border (3:1 or more on the tint). */
export const warningBg = { dark: "rgba(202, 187, 0, 0.16)", light: "rgba(136, 96, 0, 0.1)" } as const;

/** Tinted fill for information banners and badges. Text on it is `fg`; the status colour marks the icon and the border (3:1 or more on the tint). */
export const infoBg = { dark: "rgba(79, 179, 224, 0.16)", light: "rgba(0, 118, 160, 0.1)" } as const;

/** Flow step colour: sources. Badges, node accents and edges, always beside the step word; 3:1 or more on `bg`, `bg-2`, `surface` and `surface-2` in both themes. */
export const stepSource = { dark: "#6ee7b7", light: "#428569" } as const;

/** Flow step colour: transformers. Badges, node accents and edges, always beside the step word; 3:1 or more on `bg`, `bg-2`, `surface` and `surface-2` in both themes. */
export const stepTransformer = { dark: "#fcd34d", light: "#bb7000" } as const;

/** Flow step colour: the collector. Badges, node accents and edges, always beside the step word; 3:1 or more on `bg`, `bg-2`, `surface` and `surface-2` in both themes. */
export const stepCollector = { dark: "#7dd3fc", light: "#0c529b" } as const;

/** Flow step colour: destinations. Badges, node accents and edges, always beside the step word; 3:1 or more on `bg`, `bg-2`, `surface` and `surface-2` in both themes. */
export const stepDestination = { dark: "#c4b5fd", light: "#6d1fd8" } as const;

/** Flow step colour: stores. Badges, node accents and edges, always beside the step word; 3:1 or more on `bg`, `bg-2`, `surface` and `surface-2` in both themes. */
export const stepStore = { dark: "#a5b4fc", light: "#4138c9" } as const;

/** Platform badge: web, always with the word; 3:1 or more on every ground. */
export const platformWeb = { dark: "#0ea5e9", light: "#008ddd" } as const;

/** Platform badge: server, always with the word; 3:1 or more on every ground. */
export const platformServer = { dark: "#8b5cf6", light: "#8043f6" } as const;

/** First chart series: `primary` in dark, `link` in light. Series take `chart-1` to `chart-6` in order; the six stay apart in normal vision and with red-green colour blindness, and reach 3:1 on every ground. Label every series. */
export const chart1 = { dark: "#01b5e2", light: "#0076a0" } as const;

/** Second chart series (orange). */
export const chart2 = { dark: "#e69f00", light: "#ce710c" } as const;

/** Third chart series (bluish green). */
export const chart3 = { dark: "#009563", light: "#217b58" } as const;

/** Fourth chart series (vermilion). */
export const chart4 = { dark: "#e0520a", light: "#d32f4d" } as const;

/** Fifth chart series (reddish purple). */
export const chart5 = { dark: "#ff6fad", light: "#b87889" } as const;

/** Sixth chart series (yellow in dark, olive in light). */
export const chart6 = { dark: "#f0e442", light: "#546800" } as const;

/** Human notes and comment pins over visualisations, tag plans and frames. Kept apart from every step and status colour; 3:1 or more on every ground. */
export const annotation = { dark: "#22c55e", light: "#409116" } as const;

/** Editor syntax (Monaco, Shiki, Prism): comments, 4.6:1 on `code-bg`. */
export const syntaxComment = "#8c94be";

/** Editor syntax (Monaco, Shiki, Prism): strings, attribute names and inserted text, 9.9:1 on `code-bg`. */
export const syntaxString = "#c3e88d";

/** Editor syntax (Monaco, Shiki, Prism): numbers, 5.8:1 on `code-bg`. */
export const syntaxNumber = "#f78c6c";

/** Editor syntax (Monaco, Shiki, Prism): booleans, null and constants, 4.6:1 on `code-bg`. */
export const syntaxConstant = "#ff5d78";

/** Editor syntax (Monaco, Shiki, Prism): keywords and storage modifiers, 5.2:1 on `code-bg`. */
export const syntaxKeyword = "#c084fc";

/** Editor syntax (Monaco, Shiki, Prism): functions and built-ins, 5.9:1 on `code-bg`. */
export const syntaxFunction = "#82aaff";

/** Editor syntax (Monaco, Shiki, Prism): types and class names, 9.1:1 on `code-bg`. */
export const syntaxType = "#ffcb6b";

/** Editor syntax (Monaco, Shiki, Prism): operators and regular expressions, 9.0:1 on `code-bg`. */
export const syntaxOperator = "#89ddff";

/** Editor syntax (Monaco, Shiki, Prism): punctuation and delimiters, 5.7:1 on `code-bg`. */
export const syntaxPunct = "#c792ea";

/** Editor syntax (Monaco, Shiki, Prism): tags, invalid and deleted tokens, 4.6:1 on `code-bg`. */
export const syntaxTag = "#ff5d79";

/** Editor syntax (Monaco, Shiki, Prism): namespaces, 8.1:1 on `code-bg`. */
export const syntaxNamespace = "#b2ccd6";

/** Editor gutter line numbers on `code-bg`. Decorative, below 3:1. */
export const codeLineNumber = "#676e95";

/** Editor selection over `code-bg`; `code-fg` stays at 5.4:1 on it. */
export const codeSelection = "#717cb450";

/** Inserted lines in diff views over `code-bg`; `code-fg` stays at 5.4:1. */
export const codeInsertedBg = "#c3e88d26";

/** Deleted lines in diff views over `code-bg`; `code-fg` stays at 6.6:1. */
export const codeDeletedBg = "#ff5d7926";

/** Font family `sans`. */
export const fontSans = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Ubuntu, 'Helvetica Neue', Arial, sans-serif";

/** Font family `mono`. */
export const fontMono = "SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

/** Font family `viz`. */
export const fontViz = "'Geist', system-ui, sans-serif";

/** Font family `viz-mono`. */
export const fontVizMono = "'Geist Mono', monospace";

/** The one transition duration. Read it as var(--motion): reduced motion sets it to 0ms. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const motion = "180ms";

/** The one transition easing, beside var(--motion). Read it as var(--ease). Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const ease = "cubic-bezier(0.2, 0, 0, 1)";

/** Type style `display`: Hero H1 only. Fluid: clamp(38px, 6vw, 64px), max 20ch, text-wrap balance. One phrase may take `primary`. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeDisplay = { size: "64px", lineHeight: 1.08, weight: 700, tracking: "-0.025em", family: fontSans } as const;

/** Type style `heading-xl`: Large split-section heading (More features). clamp(28px, 3.6vw, 44px). Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeHeadingXl = { size: "44px", lineHeight: 1.1, weight: 700, tracking: "-0.025em", family: fontSans } as const;

/** Type style `heading-lg`: Section H2. clamp(28px, 3.6vw, 40px), text-wrap balance. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeHeadingLg = { size: "40px", lineHeight: 1.15, weight: 700, tracking: "-0.02em", family: fontSans } as const;

/** Type style `heading-md`: Feature H2 beside its explainer. clamp(26px, 3.2vw, 36px). Also the docs page title (h1), not fluid. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeHeadingMd = { size: "36px", lineHeight: 1.15, weight: 700, tracking: "-0.02em", family: fontSans } as const;

/** Type style `footer-statement`: The footer's one-line brand statement. clamp(24px, 3.2vw, 34px), max 22ch. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeFooterStatement = { size: "34px", lineHeight: 1.2, weight: 700, tracking: "-0.02em", family: fontSans } as const;

/** Type style `kicker-lg`: Large coloured kicker above `heading-xl`, in `primary`. clamp(22px, 2.4vw, 28px). Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeKickerLg = { size: "28px", lineHeight: 1.2, weight: 700, tracking: "-0.01em", family: fontSans } as const;

/** Type style `title-plan`: Plan tier name. Also docs h2. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeTitlePlan = { size: "24px", lineHeight: 1.3, weight: 700, tracking: "-0.015em", family: fontSans } as const;

/** Type style `title-card`: Problem-card H3. Also docs h3; docs h4 takes its weight. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeTitleCard = { size: "19px", lineHeight: 1.35, weight: 600, family: fontSans } as const;

/** Type style `title-item`: Feature-list H3. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeTitleItem = { size: "18px", lineHeight: 1.35, weight: 600, family: fontSans } as const;

/** Type style `lead`: Hero sub-copy in `fg-2`, max 58ch. clamp(18px, 2vw, 21px). Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeLead = { size: "21px", lineHeight: 1.65, weight: 400, family: fontSans } as const;

/** Type style `body-lg`: Feature explainer paragraphs, FAQ questions (600). Also docs h4, at the `title-card` weight. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeBodyLg = { size: "17px", lineHeight: 1.65, weight: 400, family: fontSans } as const;

/** Type style `body`: Default body copy, docs body copy included; buttons (600). Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeBody = { size: "16px", lineHeight: 1.65, weight: 400, family: fontSans } as const;

/** Type style `ui`: Nav links, list items, footer links. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeUi = { size: "15px", lineHeight: 1.5, weight: 500, family: fontSans } as const;

/** Type style `small`: Announcement bar, `Docs →` links (500), copyright (400). Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeSmall = { size: "14px", lineHeight: 1.5, weight: 600, family: fontSans } as const;

/** Type style `eyebrow`: Section eyebrow, UPPERCASE, in `link`. One line that states the problem the section answers. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeEyebrow = { size: "13px", lineHeight: 1.5, weight: 600, tracking: "0.12em", family: fontSans } as const;

/** Type style `label`: Plan tier label, UPPERCASE, in `fg-3` (`link` on the highlighted plan). Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeLabel = { size: "12px", lineHeight: 1.5, weight: 700, tracking: "0.12em", family: fontSans } as const;

/** Type style `code-command`: Install-command chip. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeCodeCommand = { size: "15px", lineHeight: 1.5, weight: 500, family: fontMono } as const;

/** Type style `code-step`: Mono step numbers (01, 02, 03) in `link`. Also code panes: the explorer's code editors and docs code blocks. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeCodeStep = { size: "13px", lineHeight: 1.5, weight: 400, family: fontMono } as const;

/** Type style `code-inline`: Inline code inside prose, docs inline code included: `surface-2` fill, `border` outline, radius-sm. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeCodeInline = { size: "0.88em", lineHeight: 1.5, weight: 400, family: fontMono } as const;

/** Type style `viz-body`: Captions inside product visualisations (Geist). Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeVizBody = { size: "15px", lineHeight: 1.5, weight: 400, family: fontViz } as const;

/** Type style `viz-chip`: Step pills inside visualisations. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeVizChip = { size: "13px", lineHeight: 1.4, weight: 500, family: fontViz } as const;

/** Type style `viz-code`: Code pane inside visualisations (Geist Mono). Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeVizCode = { size: "12px", lineHeight: 1.8, weight: 400, family: fontVizMono } as const;

/** Type style `viz-legend`: Event-part legend (Geist Mono) in `viz-fg-2`. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeVizLegend = { size: "11px", lineHeight: 1.5, weight: 400, family: fontVizMono } as const;

/** Type style `product-heading`: Page and dialog titles in the app, the explorer and Tag Mode. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeProductHeading = { size: "20px", lineHeight: 1.3, weight: 600, family: fontSans } as const;

/** Type style `product-title`: Panel, card and section titles in product UI. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeProductTitle = { size: "16px", lineHeight: 1.4, weight: 600, family: fontSans } as const;

/** Type style `product-body`: Default product copy: body text, form fields, table cells, buttons (600). Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeProductBody = { size: "14px", lineHeight: 1.5, weight: 400, family: fontSans } as const;

/** Type style `product-small`: Secondary rows, help text and dense tables. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeProductSmall = { size: "13px", lineHeight: 1.45, weight: 400, family: fontSans } as const;

/** Type style `product-caption`: Captions, badges and meta labels. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeProductCaption = { size: "12px", lineHeight: 1.4, weight: 500, family: fontSans } as const;

/** Type style `product-micro`: Dense canvas labels only: node badges, edge labels, mark labels and compact tooltip meta. Never body copy, never interactive text. Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options. */
export const typeProductMicro = { size: "11px", lineHeight: 1.3, weight: 500, family: fontSans } as const;
