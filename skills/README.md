# walkerOS Skills

Skills are the source of truth for AI assistants working with this repository.
Tool-agnostic and accessible to Claude, Cursor, Copilot, and other AI tools.

## Available Skills

### Concept Skills (Understanding)

| Skill                                                               | Description                                               |
| ------------------------------------------------------------------- | --------------------------------------------------------- |
| [understanding-development](./understanding-development/SKILL.md)   | Build, test, lint, XP principles, folder structure        |
| [understanding-flow](./understanding-flow/SKILL.md)                 | Architecture, composability, Source→Collector→Destination |
| [understanding-events](./understanding-events/SKILL.md)             | Event model, entity-action naming, properties             |
| [understanding-mapping](./understanding-mapping/SKILL.md)           | Event transformation, data/map/loop/condition             |
| [understanding-destinations](./understanding-destinations/SKILL.md) | Destination interface, env pattern, configuration         |
| [understanding-sources](./understanding-sources/SKILL.md)           | Source interface, capture patterns                        |

### Task Skills

| Skill                                                     | Description                                   |
| --------------------------------------------------------- | --------------------------------------------- |
| [testing-strategy](./testing-strategy/SKILL.md)           | Testing patterns, env mocking, dev examples   |
| [create-destination](./create-destination/SKILL.md)       | Step-by-step destination creation             |
| [create-source](./create-source/SKILL.md)                 | Step-by-step source creation                  |
| [mapping-configuration](./mapping-configuration/SKILL.md) | Mapping recipes for GA4, Meta, custom APIs    |
| [debugging](./debugging/SKILL.md)                         | Troubleshooting event flow and mapping issues |

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
