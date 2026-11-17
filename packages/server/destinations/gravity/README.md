<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-gravity

Server-side conversions to the [Gravity](https://trygravity.com) Conversions API
(ads in AI assistants), with hashed email and phone, the Gravity click
parameters and deduplication on the walkerOS event id.

[Documentation](https://www.walkeros.io/docs/destinations/server/gravity) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-gravity)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/gravity)

## Installation

```bash
npm install @walkeros/server-destination-gravity
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "gravity": {
          "package": "@walkeros/server-destination-gravity",
          "config": {
            "settings": {
              "apiKey": "$secret.GRAVITY_API_KEY"
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
**https://www.walkeros.io/docs/destinations/server/gravity**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
