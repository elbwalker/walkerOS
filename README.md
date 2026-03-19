<p align="left">
  <a href="https://www.walkeros.io">
    <img title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo_new.svg" width="256px"/>
  </a>
</p>

# Event collection you own, version, and trust

<div align="left">
  <a href="https://github.com/elbwalker/walkerOS/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/elbwalker/walkerOS" alt="License" />
  </a>
  <a href="https://www.walkeros.io/docs/">
    <img src="https://img.shields.io/badge/docs-www.walkeros.io/docs-yellow" alt="walkerOS Documentation" />
  </a>
  <a href="https://github.com/elbwalker/walkerOS/tree/main/apps/demos/react">
    <img src="https://img.shields.io/badge/React_demo-blue" alt="React demo" />
  </a>
  <a href="https://storybook.walkeros.io/">
    <img src="https://img.shields.io/badge/Storybook_demo-pink" alt="Storybook demo" />
  </a>
  <a href="https://www.npmjs.com/package/@walkeros/collector">
    <img src="https://img.shields.io/npm/v/@walkeros/collector" alt="npm version" />
  </a>
</div>

From browser to BigQuery and ad platforms - warehouse-native, and ready for AI
agents via MCP.

## The problem

GA4, custom tags, ad pixels - each one a separate setup, none of them agreeing
on the same numbers. When something breaks, you can't see where.

walkerOS is one collection layer for all of them.

## Why walkerOS?

- **Config-as-code** - version control your tracking, review it in PRs, deploy
  with confidence
- **Declarative tagging** - tag your UI in HTML, not scattered JavaScript
- **Consent-native** - events queue until consent is given, then flush correctly
  to every destination
- **Schema validation** - catch bad events at collection time, not weeks later
  in a dashboard
- **One layer, many destinations** - send to your warehouse and ad platforms
  from a single event definition
- **Warehouse-native** - events land clean and structured in your data
  warehouse, ready to query
- **MIT licensed** - self-host anywhere, no vendor lock-in

## How it works

![walkerOS Architecture](https://raw.githubusercontent.com/elbwalker/walkerOS/main/website/static/diagrams/walkeros_readme.png)

- **Sources:** Where events come from (browser, dataLayer, Express, AWS Lambda,
  GCP Functions, and more)
- **Collector:** The processing engine (consent, validation, mapping, routing,
  enrichment)
- **Destinations:** Where events go (GA4, Google Ads, Meta CAPI, BigQuery, and
  more)

## Two ways to install walkerOS

Choose one based on your workflow and integration possibilities:

| Mode           | Description                                                  | Best For                                |
| -------------- | ------------------------------------------------------------ | --------------------------------------- |
| **Integrated** | Import directly into your TypeScript application             | React/Next.js apps, TypeScript projects |
| **Bundled**    | Build a standalone script from JSON config with npx walkeros | Static sites, Docker deployments, CI/CD |

**Integrated** (import into your app):

```typescript
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { destinationGtag } from '@walkeros/web-destination-gtag';

await startFlow({
  sources: {
    browser: {
      code: sourceBrowser,
      config: { settings: { pageview: true } },
    },
  },
  destinations: {
    ga4: {
      code: destinationGtag,
      config: {
        settings: { ga4: { measurementId: 'G-XXX' } },
      },
    },
  },
});
```

**Bundled** (build from JSON config):

```json
{
  "flows": {
    "default": {
      "sources": {
        "browser": {
          "package": "@walkeros/web-source-browser",
          "config": { "settings": { "pageview": true } }
        }
      },
      "destinations": {
        "ga4": {
          "package": "@walkeros/web-destination-gtag",
          "config": {
            "settings": { "ga4": { "measurementId": "G-XXX" } }
          }
        }
      }
    }
  }
}
```

Then: `npx walkeros bundle flow.json`

- **[Operating Modes](https://www.walkeros.io/docs/getting-started/modes/)**
- **[Quickstart guide for React](https://www.walkeros.io/docs/getting-started/quickstart/react)**
- **[Full Documentation](https://www.walkeros.io/docs/)** - Complete guides and
  API reference
- **[Destinations](https://www.walkeros.io/docs/destinations/)** - GA4, Meta,
  BigQuery, and more
- **[React Demo](https://github.com/elbwalker/walkerOS/tree/main/apps/demos/react)**
- **[Storybook](https://storybook.walkeros.io/)**

## AI-ready via MCP

walkerOS exposes a Model Context Protocol (MCP) interface. AI agents can read
your event schema, suggest tracking definitions, and generate integration code -
making your event layer programmable, not just configurable.

## Contributing

⭐️ Help us grow and star us. See our
[Contributing Guidelines](https://www.walkeros.io/docs/contributing) to get
involved.

## Support

Need help? Start a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or reach out
via [email](mailto:hello@elbwalker.com).

For more insights, visit the
[talks repository](https://github.com/elbwalker/talks).

## License

Licensed under the [MIT License](./LICENSE).
