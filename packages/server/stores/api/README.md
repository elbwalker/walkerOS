<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-store-api

Read-only store for walkerOS server flows that reads one JSON record per key
from a third-party HTTP API, such as a CRM, with an optional bearer token.

[Documentation](https://www.walkeros.io/docs/stores/server/api) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-store-api) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/stores/api)

## Installation

```bash
npm install @walkeros/server-store-api
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "stores": {
        "crm": {
          "package": "@walkeros/server-store-api",
          "config": {
            "settings": { "url": "https://crm.example.com/customers/{key}" },
            "credentials": { "token": "$secret.CRM_API_TOKEN" }
          }
        }
      }
    }
  }
}
```

## Documentation

Full configuration and examples live in the docs:
**https://www.walkeros.io/docs/stores/server/api**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
