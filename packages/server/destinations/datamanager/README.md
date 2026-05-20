<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-datamanager

Server-side event ingestion via the Google Data Manager API to Google Ads,
Display & Video 360, and Google Analytics 4.

[Documentation](https://www.walkeros.io/docs/destinations/server/datamanager)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-datamanager)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/datamanager)

## Installation

```bash
npm install @walkeros/server-destination-datamanager
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "datamanager": {
          "package": "@walkeros/server-destination-datamanager",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/datamanager**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
