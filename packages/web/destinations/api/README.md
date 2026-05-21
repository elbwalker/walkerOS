<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-destination-api

Browser-side HTTP API destination with fetch, XHR, and beacon transports.

[Documentation](https://www.walkeros.io/docs/destinations/api/web) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-api)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/api)

## Installation

```bash
npm install @walkeros/web-destination-api
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
        "api": {
          "package": "@walkeros/web-destination-api",
          "config": {
            "settings": {
              "url": "https://api.example.com/events"
            }
          }
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/api/web**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
