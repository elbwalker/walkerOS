# walkerOS Storybook Demo

A lean demonstration of the **walkerOS Storybook addon** that helps developers
visualize and debug event tracking in React components.

## Why Use the walkerOS Storybook Addon?

- **Validate Implementation**: Ensure tracking works correctly before deployment
- **Component Development**: Build tracking directly into your component library
- **Team Collaboration**: Share tracking specifications with stakeholders using
  Storybook
- **Debug Tracking**: See walkerOS events in real-time as you interact with
  components

## Quick Start

```bash
# Clone and install the monorepo
git clone https://github.com/elbwalker/walkerOS.git
cd walkerOS
npm install

# Build the demo's dependencies, explorer's design CSS among them
npx turbo run build --filter=@walkeros/storybook-demo...

# Start Storybook
cd apps/demos/storybook
npm run storybook
```

Visit `http://localhost:6006` and check the **walkerOS** addon panel to see live
tracking events.

## How It Works

### 1. Add the Addon to Your Storybook

```bash
npm install @walkeros/storybook-addon
```

Add to your `.storybook/main.ts`:

```typescript
export default {
  addons: ['@walkeros/storybook-addon'],
};
```

### 2. Create Components with walkerOS Tracking (optional)

Add tracking to your components using the `dataElb` prop pattern:

```tsx
import { createTrackingProps, type DataElb } from '../shared/tagger';

interface ButtonProps {
  label: string;
  dataElb?: DataElb; // Add walkerOS tracking prop
}

export const Button = ({ label, dataElb }: ButtonProps) => {
  // The tagger converts walkerOS config to HTML data attributes
  const trackingProps = createTrackingProps(dataElb);

  return <button {...trackingProps}>{label}</button>;
};
```

The **tagger utility** automatically converts your tracking configuration into
the proper `data-elb*` attributes that walkerOS needs, while keeping your
component code clean.

### 3. Configure Storybook Controls

Add `dataElb` controls to your stories:

```typescript
export default {
  component: Button,
  argTypes: {
    dataElb: {
      control: { type: 'object' },
      description: 'walkerOS tracking configuration',
    },
  },
};

export const Primary = {
  args: {
    label: 'Click me',
    dataElb: {
      entity: 'cta_button',
      action: 'click',
      data: { campaign: 'hero' },
    },
  },
};
```

### 4. Debug in Storybook

1. Open any story with walkerOS tracking
2. Navigate to the **walkerOS** addon panel
3. Interact with components to see live events
4. Inspect event data structure and validate tracking

## Demos and the Shared Kit

Every demo is a one-page example site for an industry, built from one shared
component kit and tagged through the typed tagger in `src/shared/tagger.ts`. The
kit is tagged once and reused everywhere; each demo adds the tagging of its own
parts.

```
src/
  shared/      the kit, stories under Shared/*
    atoms/       Badge, Button, Heading, Icon, Image, Input, Link, Price,
                 Select, StarRating, Text
    molecules/   ConsentControls, FormField, LanguageToggle, NavLinks,
                 SocialLinks, StatusMessage, UserSwitch
    organisms/   ConsentBar, Footer, Header
    templates/   OnePager: header, sections, footer, pinned consent bar
    language/    elbish(), toEnglish() and the text function useText()
    personas.ts  the demo users
    consent.ts   useDemoConsent(), the demo CMP behind the consent bar
    controls.ts  DemoControls, what a page needs from whoever runs it
  demos/
    shop/      the static tagging demo as a shop (stories under Shop/*)
    media/     a streaming site (stories under Media/*)
```

- **Shop** (`src/demos/shop`): the [static tagging demo](../tagging/) rebuilt as
  components. Promotion, recommendations (with `data-elbobserve` and "Add
  product"), product detail, checkout and order complete carry the same tags as
  the static page. `Shop/Pages/Shop` shows the whole page.
- **Media** (`src/demos/media`): a streaming site with a hero banner, content
  carousels, a promotion banner and "Add row". `Media/Pages/Media` shows the
  whole page.

Every story carries `shop`, `media` or both in its `tags`, so the sidebar's tag
filter shows one demo. [story.md](./story.md) lists every component.

### Add an Industry Demo

1. Create `src/demos/<industry>/` with `data.ts` (its copy, in English, and its
   section anchors) and its own molecules and organisms, tagged with
   `createTrackingProps`.
2. Build the page from the kit: `OnePager` with the shared `Header` (your
   `links`, `<HeaderControls controls={controls} />`, your `extras`), your
   sections (each in a container with the id its anchor points at), the shared
   `Footer` and `<ConsentBar {...controls.consent} />`. The page takes
   `DemoPageProps` and wraps itself in
   `<LanguageProvider language={controls.language}>`.
3. Show every visible string through `const t = useText()`: copy, labels, `alt`,
   `aria-label`. Tag values use the untranslated data.
4. Add a page story that renders the page with `useStoryControls()`, tag every
   story with the demo's name, and add a tag parity and a language test like
   `src/demos/shop/parity.test.tsx` and `language.test.tsx`.

### Demo Users

The header's `UserSwitch` picks one of three demo users. Its root tags the user
as `data-elbuser`, which the browser source reads before the page view:

| Persona    | `?user=` | `data-elbuser`                                     |
| ---------- | -------- | -------------------------------------------------- |
| Anonymous  | none     | no attribute                                       |
| Lisa Loyal | `lisa`   | `id:lisa-loyal;email:lisa@example.com;segment:vip` |
| Sam Sales  | `sam`    | `id:sam-sales;email:sam@example.com`               |

Sam has no `segment` key on purpose: written as `segment:undefined` it would
arrive as the string "undefined". In a story the switch only re-renders; the
demo site reloads the page with `?user=`.

### English and Elbish

The `LanguageToggle` switches the page between English and Elbish, a playful
language made by a fixed letter table: vowels rotate (a to e, e to i and so on),
consonants move one step, case stays, and digits, symbols and other letters pass
unchanged. `toEnglish(elbish(text))` always gives the text back. Only visible
text changes: tag attributes never do, so a static value stays English while a
value read with `#innerText` (the promotion's name) carries the Elbish text. The
toggle sends the page language as the `language` global. Its own labels, the
persona names and system notices are never translated, so the way back and what
went wrong always read.

### Consent

The shared consent bar is on every page. Accept sends
`walker user { device: <id> }` with a short random device id (made once, reused
after) and `walker consent { functional: true, marketing: true }`. Deny sends
`walker consent { functional: true, marketing: false }` and
`walker user { device: undefined }`. Reset forgets the choice and sends nothing.
Consent never sets `user.id`: the demo user owns it. A choice replaced while its
first command is on the way sends no second command. A command that does not
reach walkerOS shows as a notice in the bar. In stories the choice lives in
story state; with `persist` (the demo site) the choice and the device id are
kept in `localStorage` (`consentState`, `demoDeviceId`) and applied again on
load, as a CMP does.

## Demo Site

The same package builds the demo pages that walkeros.io serves under `demos/`:
one HTML entry per page, no client-side routing, every asset URL relative (Vite
`base: './'`), so the pages work under any path prefix, PR previews included.

| Path on walkeros.io | Entry              | What it is     |
| ------------------- | ------------------ | -------------- |
| `/demos/shop/`      | `shop/index.html`  | the Shop page  |
| `/demos/media/`     | `media/index.html` | the Media page |

`/demos/` itself is the website's Demos page, which frames these pages. This
Storybook stays at `storybook.walkeros.io` (`storybook.yml`).

`src/site/boot.tsx` runs a demo page (`bootDemo`):

- It defines the `elb` queue of the static tagging demo first, so consent and
  user commands made before walker.js runs wait in `window.elbLayer`.
- It reads the demo user from `?user=`; switching the user reloads the page with
  the new `?user=`. The language is page state and switches live.
- It loads walker.js (`src/site/walkerjs.ts`, the managed bundle of the app flow
  "Tagging demo") after the first render, so `data-elbuser` and every tagged
  element are in the DOM when it runs.
- If walker.js does not load, the page says "walkerOS didn't load: this page
  sends no events."
- The consent bar remembers its choice in `localStorage`.

A new demo is one more entry: `<demo>/index.html`, `src/site/<demo>.tsx` calling
`bootDemo(<Demo>Page, pageRoot(document))`, one line in `vite.config.ts` and one
in `website/scripts/copy-demos.mjs` (`DEMO_PAGES`).

## Design System

Both libraries are styled only from the walkerOS design system, which lives in
`@walkeros/explorer` (a dependency of this package). `src/index.css` imports
`@walkeros/explorer/design/tailwind.css` and
`@walkeros/explorer/design/base.css`, and the Storybook toolbar switches between
the dark (default) and the light theme. `npm run lint` runs
`walkeros-design-check` over `src` and `.storybook`.

The design CSS is read from explorer's built `dist`. In a fresh clone, build it
before `npm run storybook`, `npm run build-storybook` or `npm run build`: run
`npx turbo run build --filter=@walkeros/storybook-demo...` from the repository
root (or build `apps/explorer`). A job that builds this Storybook does the same.
A standalone `npm install` of this package, outside the monorepo, needs an
`@walkeros/explorer` release that ships the design exports.

## Key Features

- **Real-time Events**: See tracking fire as you interact with components
- **Event Inspector**: Detailed JSON view of all event properties
- **Auto-refresh**: Events update automatically when you change component props
- **Clean Integration**: Use modern React patterns with the `dataElb` prop

## Useful Commands

```bash
npm run storybook        # Start development server
npm run build-storybook  # Build static version
npm run dev              # Start the demo pages (/shop/, /media/)
npm run build            # Build the demo pages into dist/
npm run preview          # Serve dist/
npm test                 # Tag parity, language, personas, consent and boot tests
```

## Deploy

The demo pages ship with the website; they have no deploy of their own:

- `website/turbo.json` makes the website `build` depend on this package's
  `build`.
- The website's `build` script runs `scripts/copy-demos.mjs` after
  `docusaurus build`. It copies this package's `dist/` (the pages, their assets
  and the favicon) into `website/build/demos/`, never over the Demos page at
  `demos/index.html`, and fails the build when the demo build is missing.
- `website.yml` also runs on changes under `apps/demos/storybook/`.

This Storybook deploys as before, through `storybook.yml` to
`storybook.walkeros.io`.

Before the merge to `main` that brings the Demos page: in the app flow "Tagging
demo", allow the origin `https://www.walkeros.io` next to
`https://tagging.walkeros.io` and redeploy the flow. Its server flow answers
cross-origin requests from `https://tagging.walkeros.io` only, so without this
every event sent from the demo pages after Accept is blocked.

The static tagging demo at `tagging.walkeros.io` stays: it is the app's preview
sandbox (`DEMO_SITE_URL`). Never add `www.walkeros.io` to the app's preview
allowlist: the "Tagging demo" bundle accepts any project's preview code.

## Learn More

- [walkerOS Documentation](https://www.walkeros.io/docs)
- [Storybook Addon Source](../../../storybook-addon/)
- [walkerOS GitHub](https://github.com/elbwalker/walkerOS)
