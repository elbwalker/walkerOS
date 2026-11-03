<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-destination-piwikpro

Privacy-focused web analytics and visitor data platform.

[Documentation](https://www.walkeros.io/docs/destinations/web/piwikpro) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-piwikpro)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/piwikpro)

## Installation

```bash
npm install @walkeros/web-destination-piwikpro
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": {
        "platform": "web"
      },
      "destinations": {
        "piwikpro": {
          "package": "@walkeros/web-destination-piwikpro",
          "config": {
            "loadScript": true,
            "settings": {
              "appId": "XXX-XXX-XXX-XXX-XXX",
              "url": "https://your_account_name.piwik.pro/"
            }
          }
        }
      }
    }
  }
}
```

This quick start sets no consent, so Piwik PRO's script loads and receives every
event without consent, and a revocation changes nothing: add
`consent: { analytics: true }` to `config` before you go live, see the docs.

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/web/piwikpro**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
