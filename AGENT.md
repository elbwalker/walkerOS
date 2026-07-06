# AGENT.md - walkerOS Developer Hub

> walkerOS is a privacy-first event data collection and tag management solution.
> Architecture: **Source → Collector → Destination(s)**

## Quick Start

```bash
npm install        # Install dependencies
npm run dev        # Watch mode
npm run build      # Build all packages
npm run test       # Run tests
npm run lint       # Check code quality
```

## Understanding walkerOS

Learn the concepts before coding:

| Skill                                                                             | What You'll Learn                                                          |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [understanding-development](skills/walkeros-understanding-development/SKILL.md)   | Build workflow, XP principles, folder structure                            |
| [understanding-flow](skills/walkeros-understanding-flow/SKILL.md)                 | Architecture, composability, data flow                                     |
| [understanding-events](skills/walkeros-understanding-events/SKILL.md)             | Event model, entity-action naming, properties                              |
| [understanding-mapping](skills/walkeros-understanding-mapping/SKILL.md)           | Event transformation, data/map/loop                                        |
| [understanding-destinations](skills/walkeros-understanding-destinations/SKILL.md) | Destination interface, env pattern                                         |
| [understanding-sources](skills/walkeros-understanding-sources/SKILL.md)           | Source interface, capture patterns                                         |
| [understanding-transformers](skills/walkeros-understanding-transformers/SKILL.md) | Transformer interface, chaining, pipeline                                  |
| [understanding-stores](skills/walkeros-understanding-stores/SKILL.md)             | Store interface, $store. wiring, lifecycle                                 |
| [using-logger](skills/walkeros-using-logger/SKILL.md)                             | Logger access, DRY principles, when to log                                 |
| [using-step-examples](skills/walkeros-using-step-examples/SKILL.md)               | Step examples lifecycle, Three Type Zones, testing                         |
| [using-store-cache](skills/walkeros-using-store-cache/SKILL.md)                   | Recipes for store-level cache, multi-tier composition                      |
| [using-transformer-ga4](skills/walkeros-using-transformer-ga4/SKILL.md)           | Wire `@walkeros/transformer-ga4`, override mappings, troubleshoot decoding |
| [mcp-actions](skills/walkeros-mcp-actions/SKILL.md)                               | Call walkerOS MCP tools from code execution, filter results in code        |

## Creating Things

| Task                | Skill                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| Write tests         | [testing-strategy](skills/walkeros-testing-strategy/SKILL.md)           |
| Create destination  | [create-destination](skills/walkeros-create-destination/SKILL.md)       |
| Create source       | [create-source](skills/walkeros-create-source/SKILL.md)                 |
| Create transformer  | [create-transformer](skills/walkeros-create-transformer/SKILL.md)       |
| Configure mappings  | [mapping-configuration](skills/walkeros-mapping-configuration/SKILL.md) |
| Debug event flow    | [debugging](skills/walkeros-debugging/SKILL.md)                         |
| Write documentation | [writing-documentation](skills/walkeros-writing-documentation/SKILL.md) |

## Package Navigation

```text
packages/
├── core/           # Types, utilities, schemas (@walkeros/core)
├── collector/      # Event processing engine
├── config/         # Shared tooling config
├── mcps/           # Parent for MCP server packages
│   ├── mcp/            # Flow dev MCP server (@walkeros/mcp)
│   └── source-browser/ # Tagging MCP server (@walkeros/mcp-source-browser)
├── web/            # Browser: sources/, destinations/
└── server/         # Node.js: sources/, destinations/

apps/
├── explorer/       # Component & style library (@walkeros/explorer)
├── quickstart/     # Validated examples (source of truth)
├── walkerjs/       # Browser bundle
└── demos/          # Demo applications
```

## Key Files

| What                  | Where                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| Event types           | [packages/core/src/types/walkeros.ts](packages/core/src/types/walkeros.ts)       |
| Mapping functions     | [packages/core/src/mapping.ts](packages/core/src/mapping.ts)                     |
| Flow type             | [packages/core/src/types/flow.ts](packages/core/src/types/flow.ts)               |
| Destination interface | [packages/core/src/types/destination.ts](packages/core/src/types/destination.ts) |
| Source interface      | [packages/core/src/types/source.ts](packages/core/src/types/source.ts)           |
| Validated examples    | [apps/quickstart/](apps/quickstart/)                                             |

## Non-Negotiables

- **Event naming:** `"entity action"` format with space (`"page view"`, not
  `"page_view"`)
- **No `any`:** Never in production code
- **XP principles:** DRY, KISS, YAGNI, TDD
- **Test first:** Watch it fail before implementing
- **Verify:** Use the verification tiers from `/workspaces/developer/AGENT.md`
  rule 11. Default L1 (touched package) per task. L2 at plan completion. Never
  L4 unless the plan touched shared infra or the user asked.

## Creating/Maintaining Skills

Skills are packaged as a **Claude Code plugin** via `.claude-plugin/`:

| Location                     | Purpose                               |
| ---------------------------- | ------------------------------------- |
| `skills/[name]/SKILL.md`     | Primary content (source of truth)     |
| `.claude-plugin/plugin.json` | Plugin manifest listing all skills    |
| `.claude/skills/`            | Symlink to `../skills/` for local dev |

**To create a new skill:**

1. Create skill: `skills/[name]/SKILL.md` with frontmatter:
   ```markdown
   ---
   name: [name]
   description: [When to use - shown in Claude Code skill list]
   ---
   ```
2. Add to `.claude-plugin/plugin.json` skills array
3. Add to AGENT.md tables above (Understanding or Creating section)
4. Add to [skills/README.md](skills/README.md) index

**External users** install via: `/plugin marketplace add elbwalker/walkerOS`
