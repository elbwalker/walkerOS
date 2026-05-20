<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-source-fetch

Web Standard Fetch API source for walkerOS. A platform-agnostic
`(Request) => Response` handler that runs on Cloudflare Workers, Vercel Edge,
Deno, Bun, and Node.js 18+, with batch processing, configurable CORS, and pixel
tracking.

[Documentation](https://www.walkeros.io/docs/sources/server/fetch) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-source-fetch)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/sources/fetch)

## Installation

```bash
npm install @walkeros/server-source-fetch
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "sources": {
        "fetch": { "package": "@walkeros/server-source-fetch", "config": {} }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/sources/server/fetch**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
