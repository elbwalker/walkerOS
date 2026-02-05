# walkerOS Skills

Skills are the source of truth for AI assistants working with this repository.
Tool-agnostic and accessible to Claude, Cursor, Copilot, and other AI tools.

## Available Skills

### Concept Skills (Understanding)

| Skill                                                                        | Description                                               |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| [understanding-development](./walkeros-understanding-development/SKILL.md)   | Build, test, lint, XP principles, folder structure        |
| [understanding-flow](./walkeros-understanding-flow/SKILL.md)                 | Architecture, composability, Source→Collector→Destination |
| [understanding-events](./walkeros-understanding-events/SKILL.md)             | Event model, entity-action naming, properties             |
| [understanding-mapping](./walkeros-understanding-mapping/SKILL.md)           | Event transformation, data/map/loop/condition             |
| [understanding-transformers](./walkeros-understanding-transformers/SKILL.md) | Transformer interface, chaining, validate/enrich/redact   |
| [understanding-destinations](./walkeros-understanding-destinations/SKILL.md) | Destination interface, env pattern, configuration         |
| [understanding-sources](./walkeros-understanding-sources/SKILL.md)           | Source interface, capture patterns                        |
| [using-logger](./walkeros-using-logger/SKILL.md)                             | Logger access, DRY principles, API logging patterns       |

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

1. Create `skills/[skill-name]/SKILL.md` with full content
2. Create `.claude/skills/[skill-name]/SKILL.md` reference
3. Update this README
4. Update AGENT.md navigation if needed
