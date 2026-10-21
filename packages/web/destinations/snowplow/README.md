<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/web-destination-snowplow

Behavioral data platform destination with ecommerce tracking.

[Documentation](https://www.walkeros.io/docs/destinations/web/snowplow) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-snowplow)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/snowplow)

## Installation

```bash
npm install @walkeros/web-destination-snowplow
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
        "snowplow": {
          "package": "@walkeros/web-destination-snowplow",
          "config": {
            "settings": { "collectorUrl": "https://collector.example.com" }
          }
        }
      }
    }
  }
}
```

## Plugins

URL plugins in `settings.plugins` load with sp.js. With `settings.tracker` (your
own browser tracker), init fails with a `config` error if any are set: load them
on your own tracker, or drop `settings.tracker` so walkerOS loads them.

## Consent

With `config.consent` set, a revocation of that consent stops walkerOS's events
and the senders that run on their own: activity pings (`activityTracking`) and
the sp.js plugins for link clicks, forms, buttons and YouTube. The next grant
starts them again. The error tracking and FocalMeter plugins have no off switch,
so a revocation fails with `consent-not-applied` while they keep sending: load
them only after consent. Other plugins are not switched.

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/web/snowplow**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
