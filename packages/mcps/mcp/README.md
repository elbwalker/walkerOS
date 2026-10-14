<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/mcp

The local walkerOS MCP server: validate, simulate, bundle and push flows on your
own machine; the hosted server at https://app.walkeros.io/api/mcp covers what
the walkerOS app stores.

[Documentation](https://www.walkeros.io/docs/apps/mcp) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/mcp) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/mcps/mcp)

## Installation

```bash
npm install @walkeros/mcp
```

## Quick start

The server runs over stdio and is started by your MCP client. Add it to the
client's configuration:

```json
{
  "mcpServers": {
    "walkeros-flow": {
      "command": "npx",
      "args": ["@walkeros/mcp"]
    }
  }
}
```

## Documentation

Tools, resources, prompts, programmatic usage and the hosted server live in the
docs: **https://www.walkeros.io/docs/apps/mcp**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
