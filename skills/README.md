# walkerOS Skills

Skills are the source of truth for AI assistants working with this repository.
Tool-agnostic and accessible to Claude, Cursor, Copilot, and other AI tools.

## Available Skills

### Concept Skills (Understanding)

| Skill                                                                        | Description                                                |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [understanding-development](./walkeros-understanding-development/SKILL.md)   | Build, test, lint, XP principles, folder structure         |
| [understanding-flow](./walkeros-understanding-flow/SKILL.md)                 | Architecture, composability, Source→Collector→Destination  |
| [understanding-events](./walkeros-understanding-events/SKILL.md)             | Event model, entity-action naming, properties              |
| [understanding-mapping](./walkeros-understanding-mapping/SKILL.md)           | Event transformation, data/map/loop/condition              |
| [understanding-transformers](./walkeros-understanding-transformers/SKILL.md) | Transformer interface, chaining, validate/enrich/redact    |
| [understanding-destinations](./walkeros-understanding-destinations/SKILL.md) | Destination interface, env pattern, configuration          |
| [understanding-sources](./walkeros-understanding-sources/SKILL.md)           | Source interface, capture patterns                         |
| [understanding-stores](./walkeros-understanding-stores/SKILL.md)             | Store interface, $store. wiring, lifecycle                 |
| [using-logger](./walkeros-using-logger/SKILL.md)                             | Logger access, DRY principles, API logging patterns        |
| [using-step-examples](./walkeros-using-step-examples/SKILL.md)               | Step examples, Three Type Zones, in/out format             |
| [using-store-cache](./walkeros-using-store-cache/SKILL.md)                   | Recipes for store-level cache, multi-tier composition      |
| [using-transformer-ga4](./walkeros-using-transformer-ga4/SKILL.md)           | Wire `@walkeros/transformer-ga4`, override mappings        |
| [mcp-actions](./walkeros-mcp-actions/SKILL.md)                               | Call MCP tools from code execution, filter results in code |

### Task Skills

| Skill                                                              | Description                                    |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| [testing-strategy](./walkeros-testing-strategy/SKILL.md)           | Testing patterns, env mocking, dev examples    |
| [create-transformer](./walkeros-create-transformer/SKILL.md)       | Step-by-step transformer creation              |
| [create-destination](./walkeros-create-destination/SKILL.md)       | Step-by-step destination creation              |
| [create-source](./walkeros-create-source/SKILL.md)                 | Step-by-step source creation                   |
| [mapping-configuration](./walkeros-mapping-configuration/SKILL.md) | Mapping recipes for GA4, Meta, custom APIs     |
| [debugging](./walkeros-debugging/SKILL.md)                         | Troubleshooting event flow and mapping issues  |
| [writing-documentation](./walkeros-writing-documentation/SKILL.md) | Documentation standards, validation, templates |

## Architecture

```
skills/                  <- Primary content (tool-agnostic)
.claude/skills/          <- Claude Code references (auto-discovery)
```

## Usage

### Claude Code

Skills in `.claude/skills/` are auto-discovered and reference primary files
here.

### Other AI Tools

Reference skills in this directory directly.

## Adding New Skills

See the "Creating/Maintaining Skills" section in [AGENT.md](../AGENT.md) for the
full process. In short: create `skills/<name>/SKILL.md` (no separate
`.claude/skills/` copy, that path is a symlink to `../skills/`), then register
the skill in `.claude-plugin/plugin.json`, AGENT.md, and this README.
