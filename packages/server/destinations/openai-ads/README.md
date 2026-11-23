<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-openai-ads

Server-side conversions to the OpenAI Ads (ChatGPT ads) Conversions API, with
hashed identity fields, the `oppref` click reference and amounts in ISO 4217
minor units.

[Documentation](https://www.walkeros.io/docs/destinations/server/openai-ads)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-openai-ads)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/openai-ads)

## Installation

```bash
npm install @walkeros/server-destination-openai-ads
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "openai-ads": {
          "package": "@walkeros/server-destination-openai-ads",
          "config": {
            "settings": {
              "apiKey": "$secret.OPENAI_CONVERSIONS_API_KEY",
              "pixelId": "YOUR_PIXEL_ID"
            }
          }
        }
      }
    }
  }
}
```

`apiKey` is the Conversions API key from Ads Manager, not the Advertiser API
key. Without a `mapping`, page views, product views, product adds and completed
orders are sent as `page_viewed`, `contents_viewed`, `items_added` and
`order_created`, and every other event is ignored.

This quick start sets no consent: add `consent: { marketing: true }` to `config`
before you go live, see the docs.

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/openai-ads**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
