<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-destination-piano

Send walkerOS events to Piano Analytics.

[Documentation](https://www.walkeros.io/docs/destinations/web/piano) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-piano)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/piano)

This destination forwards collector-processed events to the official
[Piano Analytics JavaScript SDK](https://github.com/at-internet/piano-analytics-js)
(`pa`) via `pa.sendEvent`.

## Installation

```bash
npm install @walkeros/web-destination-piano
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
        "piano": {
          "package": "@walkeros/web-destination-piano",
          "config": {
            "loadScript": true,
            "settings": {
              "site": 123456789,
              "collectDomain": "https://example.pa-cd.com"
            }
          }
        }
      }
    }
  }
}
```

With `loadScript: true` the destination loads the Piano SDK script and calls
`pa.setConfigurations({ site, collectDomain })` on init. If you load the SDK
yourself, omit `loadScript` and make sure `pa` is available on `window`.

## Settings

| Setting         | Type     | Required | Description                                                  |
| --------------- | -------- | -------- | ------------------------------------------------------------ |
| `site`          | `number` | yes      | Piano Analytics site id, from your collection settings.      |
| `collectDomain` | `string` | yes      | Collection domain endpoint, like `https://xxxxxxx.pa-cd.com` |
| `options`       | `object` | no       | Additional Piano `setConfigurations` options merged on init. |

## Mapping

Each event is mapped to a Piano event name and a property object, then sent with
`pa.sendEvent(name, data)`. Piano uses dot-notation event names like
`page.display`.

| walkerOS event   | Piano event                | Notes                       |
| ---------------- | -------------------------- | --------------------------- |
| `page view`      | `page.display`             | Page name and chapter.      |
| `order complete` | `transaction.confirmation` | Transaction id and revenue. |

```json
{
  "mapping": {
    "page": {
      "view": {
        "name": "page.display",
        "data": { "map": { "page": "data.title" } }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/web/piano**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
