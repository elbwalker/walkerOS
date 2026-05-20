<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-twitter

Server-side event delivery to X's (Twitter's) Conversions API for enhanced ad
attribution and privacy-compliant conversion tracking.

[Documentation](https://www.walkeros.io/docs/destinations/server/twitter) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-twitter)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/twitter)

## Installation

```bash
npm install @walkeros/server-destination-twitter
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "twitter": {
          "package": "@walkeros/server-destination-twitter",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/twitter**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
