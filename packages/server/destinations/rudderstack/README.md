<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-rudderstack

Server-side event delivery to RudderStack via the official rudder-sdk-node SDK,
implementing the full Segment Spec surface with automatic identity
deduplication.

[Documentation](https://www.walkeros.io/docs/destinations/server/rudderstack)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-rudderstack)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/rudderstack)

## Installation

```bash
npm install @walkeros/server-destination-rudderstack
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "rudderstack": {
          "package": "@walkeros/server-destination-rudderstack",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/rudderstack**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
