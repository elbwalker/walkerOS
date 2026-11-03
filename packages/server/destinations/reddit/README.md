<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-reddit

Server-side event delivery to Reddit's Conversions API v2.0 for enhanced
conversion tracking, bypassing browser limitations and improving match quality
for ad optimization.

[Documentation](https://www.walkeros.io/docs/destinations/server/reddit) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-reddit)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/reddit)

## Installation

```bash
npm install @walkeros/server-destination-reddit
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "reddit": {
          "package": "@walkeros/server-destination-reddit",
          "config": {
            "settings": {
              "accessToken": "$secret.REDDIT_ACCESS_TOKEN",
              "pixelId": "YOUR_PIXEL_ID"
            }
          }
        }
      }
    }
  }
}
```

This quick start sets no consent: add `consent: { marketing: true }` to `config`
before you go live, see the docs.

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/reddit**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
