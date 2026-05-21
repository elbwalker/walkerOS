<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-slack

Send walkerOS events to Slack as formatted messages via Incoming Webhooks or the
Web API, with multi-channel routing, threading, DMs, and Block Kit support.

[Documentation](https://www.walkeros.io/docs/destinations/server/slack) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-slack)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/slack)

## Installation

```bash
npm install @walkeros/server-destination-slack
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "slack": {
          "package": "@walkeros/server-destination-slack",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/slack**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
