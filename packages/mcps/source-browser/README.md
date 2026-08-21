<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# @walkeros/mcp-source-browser

Model Context Protocol server for walkerOS HTML tagging. Generates, parses, and
validates `data-elb` attributes using real DOM parsing, so an AI assistant can
tag a page and check its own work. Runs locally, no account or API token.

[Documentation](https://www.walkeros.io/docs/apps/mcp) &bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/mcp-source-browser) &bull;
[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/mcps/source-browser)

## Installation

The server runs over stdio and is started by your MCP client. Add it to the
client's configuration:

```json
{
  "mcpServers": {
    "walkeros-source-browser": {
      "command": "npx",
      "args": ["@walkeros/mcp-source-browser"]
    }
  }
}
```

In Claude Code you can install the walkerOS plugin instead, which registers this
server along with the flow development server and the walkerOS skills:

```
/plugin marketplace add elbwalker/walkerOS
/plugin install walkeros@elbwalker
```

To install the binary directly:

```bash
npm install @walkeros/mcp-source-browser
```

## Tools

| Tool               | Description                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `generate_tagging` | Turn structured input into `data-elb` attributes and an example HTML snippet                       |
| `parse_tagging`    | Parse an HTML snippet and extract the walkerOS events and globals it produces                      |
| `validate_tagging` | Check tagging for orphan actions, missing entities, unknown triggers, and entities without actions |

All three accept an optional `prefix` to match a custom attribute prefix, which
defaults to `data-elb`.

## Resources

| URI                                       | Content                                    |
| ----------------------------------------- | ------------------------------------------ |
| `walkeros://docs/tagging/html-attributes` | Guide to `data-elb` HTML attribute tagging |
| `walkeros://docs/tagging/tagger`          | `createTagger()` fluent API reference      |

## Documentation

Full parameter tables and examples live in the docs:
**https://www.walkeros.io/docs/apps/mcp**

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

MIT
