<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-mparticle

Server-side event delivery to mParticle via the HTTP Events API, with support
for user identities, attributes, consent state, and environment targeting.

[Documentation](https://www.walkeros.io/docs/destinations/server/mparticle)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-mparticle)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/mparticle)

## Installation

```bash
npm install @walkeros/server-destination-mparticle
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "mparticle": {
          "package": "@walkeros/server-destination-mparticle",
          "config": {}
        }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/mparticle**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
