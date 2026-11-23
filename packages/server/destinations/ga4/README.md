<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-ga4

Server-side events to Google Analytics 4 through the Measurement Protocol:
conversions and other server events join the visitor's GA4 session when the
`_ga` client id and session id are mapped.

[Documentation](https://www.walkeros.io/docs/destinations/server/ga4) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-ga4)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/ga4)

## Installation

```bash
npm install @walkeros/server-destination-ga4
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "ga4": {
          "package": "@walkeros/server-destination-ga4",
          "config": {
            "settings": {
              "measurementId": "G-XXXXXXXXXX",
              "apiSecret": "$secret.GA4_API_SECRET"
            }
          }
        }
      }
    }
  }
}
```

This quick start sets no consent: add `consent: { analytics: true }` to `config`
before you go live, see the docs.

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/ga4**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
