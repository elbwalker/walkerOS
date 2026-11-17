<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-reditus

Server-side referral conversions and payments to
[Reditus](https://www.getreditus.com), the affiliate and referral platform: a
referred sign-up or demo becomes a conversion, a referred customer's payment is
credited to the partner.

[Documentation](https://www.walkeros.io/docs/destinations/server/reditus) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-reditus)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/reditus)

## Installation

```bash
npm install @walkeros/server-destination-reditus
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "reditus": {
          "package": "@walkeros/server-destination-reditus",
          "config": {
            "settings": {
              "apiKey": "$secret.REDITUS_API_KEY"
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
**https://www.walkeros.io/docs/destinations/server/reditus**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
