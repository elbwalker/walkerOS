<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-piwikpro

Server-side delivery of walkerOS events to the Piwik PRO Tracking API. It uses
the same mapping format as the Piwik PRO web destination: `rule.name` is a Piwik
PRO JavaScript method such as `trackEvent` or `ecommerceOrder`, and a web
mapping copied to the server produces the same hits, sent as one bulk request
per batch.

[Documentation](https://www.walkeros.io/docs/destinations/server/piwikpro)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-piwikpro)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/piwikpro)

## Installation

```bash
npm install @walkeros/server-destination-piwikpro
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "piwikpro": {
          "package": "@walkeros/server-destination-piwikpro",
          "config": {
            "settings": {
              "url": "https://your_account_name.piwik.pro/",
              "appId": "XXX-XXX-XXX-XXX-XXX"
            },
            "batch": { "size": 100, "wait": 1000 }
          }
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/piwikpro**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
