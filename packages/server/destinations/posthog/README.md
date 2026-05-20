<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-posthog

Server-side event delivery to PostHog for product analytics, identity
resolution, group analytics, and feature flags via the official posthog-node
SDK.

[Documentation](https://www.walkeros.io/docs/destinations/server/posthog) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-posthog)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/posthog)

## Installation

```bash
npm install @walkeros/server-destination-posthog
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "posthog": {
          "package": "@walkeros/server-destination-posthog",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/posthog**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
