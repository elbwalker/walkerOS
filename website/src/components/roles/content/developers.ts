import type { RoleContent } from '../roles';

const content: RoleContent = {
  slug: 'developers',
  meta: {
    title: 'walkerOS for developers: tracking in your own codebase',
    description:
      'Tag components with data-elb or elb() calls, keep vendor formats in mapping config, and check events with a contract and the CLI before you deploy.',
  },
  hero: {
    headline:
      'Tracking that ships with the feature, reviewed in the same pull request.',
    lede: 'Tag components with `data-elb` attributes or call `elb()` from your code. The browser source turns those into events, the collector adds consent, user and globals, and each destination maps them into its vendor format, all configured in TypeScript or in a `flow.json` you review like any other file.',
    primary: {
      label: 'Start the quickstart',
      href: '/docs/getting-started/quickstart/',
    },
    secondary: {
      label: 'See the event model',
      href: '/docs/getting-started/event-model',
    },
  },
  situations: {
    headline: 'Tracking bugs that end up on your desk',
    items: [
      {
        claim:
          'The router changes the URL without a page load. Now `page_view` never fires, or fires twice once someone adds a History Change trigger on top of Enhanced Measurement.',
        witness:
          "The browser source does not try to detect route changes. You call `elb('walker run')` when your router navigates, which fires one `page view` and re-scans the page for tagged elements. The [React](/docs/getting-started/quickstart/react) and [Next.js](/docs/getting-started/quickstart/nextjs) quickstarts show where the call goes and how to skip it on the first render.",
      },
      {
        claim:
          'The tag fires before the `dataLayer.push` it depends on and sends `undefined`. It works in preview and on slow pages, and loses data on fast ones.',
        witness:
          'A tagged click is resolved in the capture phase, from the DOM as it is at click time and before your own click handlers run, so the event reads the `data-elb-*` values of the element that was clicked. Calls queued on `window.elbLayer` before walkerOS loads are processed once it starts. See the click trigger in the [HTML attributes reference](/docs/sources/web/browser/tagging/html-attributes).',
      },
      {
        claim:
          'The feature ships Thursday. Its tracking ticket is still in the backlog, because tracking lives in another system with its own workflow and loses every prioritization fight.',
        witness:
          'The tracking is `data-elb` markup in the component file, so it lands in the same pull request as the feature and gets the same review. In JSX, [createTagger](/docs/sources/web/browser/tagger) builds the attributes as an object you spread onto the element and escapes the values for you.',
      },
      {
        claim:
          "Every tracked interaction is a hand-written call in one vendor's format, so a vendor switch or even a spec update means touching every call site.",
        witness:
          "Your markup and `elb()` calls use your own entity and action names. The vendor's event names and fields live in each destination's [mapping](/docs/mapping), so the next vendor change is a config diff.",
      },
    ],
  },
  changes: [
    {
      kicker: 'Tagging',
      headline: 'Tracking attributes live in the component file',
      body: '`data-elb` names the entity, `data-elb-product` holds its properties, and `data-elbaction` pairs a trigger such as `click` or `visible` with the action to fire. The browser source reads those values from the DOM when the trigger fires, so a component that moves or rerenders takes its tracking along. Renaming CSS classes in a redesign leaves it alone.',
      code: `<div data-elb="product" data-elbaction="visible:view">
  <h2 data-elb-product="name:Everyday Ruck Snack">Everyday Ruck Snack</h2>
</div>`,
      caption:
        "Fires `product view` with `data: { name: 'Everyday Ruck Snack' }` once the card has been on screen for a second, and again each time it comes back into view. Reference: [HTML attributes](/docs/sources/web/browser/tagging/html-attributes).",
    },
    {
      kicker: 'Contracts',
      headline:
        'Write down what an event must contain, and drop what breaks it',
      body: 'A contract is JSON Schema keyed by entity and action, kept in the top-level `contract` block of `flow.json`. A [validate transformer](/docs/transformers/validate) references it with `$contract.<name>`. In `strict` mode an event that fails is dropped before any destination sees it; in `pass` mode it continues with `source.valid` set to `false`, so a later step can route it. Contracts can `extend` each other, which keeps a shared base and a per-site addition in one file.',
      code: `{
  "version": 4,
  "contract": {
    "web": {
      "events": {
        "order": {
          "complete": {
            "properties": { "data": { "required": ["total", "currency"] } }
          }
        }
      }
    }
  },
  "flows": {
    "default": {
      "transformers": {
        "validate": {
          "package": "@walkeros/transformer-validate",
          "config": {
            "settings": { "contract": ["$contract.web"], "mode": "strict" }
          },
          "next": "ga4"
        }
      }
    }
  }
}`,
      caption:
        'An `order complete` without `data.total` or `data.currency` stops at this step and never reaches `ga4`. Inheritance and wildcards: [contract](/docs/getting-started/flow/contract).',
    },
    {
      kicker: 'Testing',
      headline: 'Catch a broken event in CI',
      body: 'Each step in a flow can carry named `{ in, out }` examples. `walkeros validate flow.json` checks that connected steps fit together and that every example satisfies the contract. With `--strict` a violation counts as an error and the command exits non-zero, which fails the build. `walkeros push --simulate` runs one event through the flow with the named destination mocked and reports whether it accepted the event, without calling the vendor.',
      code: `# Fails the build if an example breaks the contract
walkeros validate flow.json --strict

# Runs one event with the ga4 destination mocked
walkeros push flow.json --simulate destination.ga4 --event '{"name":"page view","data":{"title":"Home"}}'`,
      caption:
        'Example format: [step examples](/docs/getting-started/flow/step-examples). Every command and flag: [CLI reference](/docs/apps/cli).',
    },
  ],
  fit: {
    headline: 'walkerOS runs next to what already sends events',
    stays: [
      'Your `dataLayer.push` calls and your GTM container. They keep running, and the [dataLayer source](/docs/sources/web/dataLayer) can read the same pushes into walkerOS while you move to `data-elb` one component at a time.',
      'Your analytics vendors. Each one becomes a destination with its own mapping, so adding or swapping one is a config change.',
      'Your build, code review and CI. A flow is TypeScript in your app or a `flow.json` in the repo, so it goes through the same pull requests as the rest of your code.',
      'Your naming. Entities and actions come from your product, written as `entity action` with a space.',
    ],
    changes: [
      'Tracking moves into component markup or your own `elb()` calls and gets reviewed with the feature.',
      'Vendor event names and fields move out of your code into one mapping per destination.',
      'A contract in `flow.json` states what each event must contain, and a validate transformer drops or flags events that break it.',
      'You pick a [mode](/docs/getting-started/modes). Integrated runs the collector inside your app, typed and configured through `startFlow`. Bundled keeps the setup in `flow.json`, and the CLI builds it into a separate file.',
    ],
    firstStep:
      'Run `npm install @walkeros/collector @walkeros/web-source-browser`, add the console destination from the [quickstart](/docs/getting-started/quickstart/), then tag one component with `data-elb` and watch its event in the console before you connect a real vendor.',
  },
  limits: [
    'Contracts are JSON Schema you write by hand. Nothing generates one from a tracking plan spreadsheet or infers it from the events you already send.',
    'Tagging an existing app is work you do component by component. walkerOS does not scan an untagged site to add attributes, and it does not convert a GTM container.',
    '`walkeros validate` checks the examples in your flow, not your real components. A release that drops a `data-elb-product` attribute still passes it, and the gap shows up only at runtime, when a validate transformer checks the live event.',
    '`walkeros push --simulate` reports success or failure per destination. It does not print the vendor payload, so to inspect that you need the `flow_simulate` tool of the [MCP server](/docs/apps/mcp) with `verbose` set.',
    'When contracts `extend` each other, only `properties` and `required` merge. Keywords such as `oneOf`, `enum` and `allOf` take the child value, so combine those in one schema yourself.',
  ],
  questions: [
    {
      question:
        'Why name events "product view" when "Product Viewed" reads better for stakeholders?',
      answer:
        'The entity comes first because the rest hangs off it: `data-elb-product` holds the properties, a destination mapping is keyed `product.view`, and a contract rule under `product` with the `*` action applies to every product action. Free-form names drift, which is how one tool ends up with `page_view` and another with `Page Viewed`. A friendlier label for stakeholders belongs in the report. See `product view` become GA4 `view_item` in the [mapping example](/docs/mapping).',
    },
    {
      question:
        'Our tracking is DOM-based in GTM and mostly works. What changes, and what do we keep?',
      answer:
        'You keep the container and your `dataLayer.push` calls, and you add `data-elb` attributes next to them one component at a time. The failure mode is what changes: a GTM trigger on a CSS selector is separate from the markup it depends on, so a template change can break it without anyone noticing, while a `data-elb` attribute sits on the element and moves with it. Retire each old trigger once the tagged component sends what you expect. The [HTML attributes reference](/docs/sources/web/browser/tagging/html-attributes) has the full syntax to compare against your triggers.',
    },
    {
      question:
        'How do I know a mapping or contract change is right before it deploys?',
      answer:
        "Give the step a named `{ in, out }` example and run `walkeros validate flow.json --strict` in CI. It fails when an example breaks the contract or when connected steps don't fit. `walkeros push flow.json --simulate destination.<name>` then runs a real event through the flow with that destination mocked. The [validate guide](/docs/getting-started/flow/validate) walks through breaking a contract on purpose so you can see the error it prints.",
    },
  ],
  next: {
    headline: 'Where to go from here',
    links: [
      {
        label: 'Read the docs',
        href: '/docs/getting-started/',
        note: 'How sources, the collector, transformers and destinations fit together.',
      },
      {
        label: 'CLI reference',
        href: '/docs/apps/cli',
        note: 'Commands, flags and exit codes for validate, push, bundle and run.',
      },
      {
        label: 'MCP server',
        href: '/docs/apps/mcp',
        note: 'Load, validate and simulate a flow from an AI assistant in your editor.',
      },
    ],
  },
};

export default content;
