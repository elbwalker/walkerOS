<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-meta

Server-side event delivery to Meta's Conversions API. Customer information in
`user_data` (email, phone, name, date of birth, gender, city, state, zip code,
country, external ID) is normalized and SHA-256 hashed before it leaves your
server; the client IP, the user agent and the other parameters are sent as they
are.

[Documentation](https://www.walkeros.io/docs/destinations/server/meta-capi)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-meta)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/meta)

## Installation

```bash
npm install @walkeros/server-destination-meta
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "meta": {
          "package": "@walkeros/server-destination-meta",
          "config": {
            "settings": {
              "accessToken": "$secret.META_ACCESS_TOKEN",
              "pixelId": "1234567890"
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
**https://www.walkeros.io/docs/destinations/server/meta-capi**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
