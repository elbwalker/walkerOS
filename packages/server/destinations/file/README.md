<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/server-destination-file

Local file sink for walkerOS server flows. Appends events as JSONL, TSV, or CSV
for debug logging, audit trails, and cold archive.

[Documentation](https://www.walkeros.io/docs/destinations/server/file) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-file)
&bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/file)

## Installation

```bash
npm install @walkeros/server-destination-file
```

## Quick start

```json
{
  "version": 4,
  "flows": {
    "default": {
      "config": { "platform": "server" },
      "destinations": {
        "file": { "package": "@walkeros/server-destination-file", "config": {} }
      }
    }
  }
}
```

## Documentation

Full configuration, mapping, and examples live in the docs:
**https://www.walkeros.io/docs/destinations/server/file**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
