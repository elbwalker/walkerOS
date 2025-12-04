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

| Skill                                                                    | What You'll Learn                               |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| [understanding-development](skills/understanding-development/SKILL.md)   | Build workflow, XP principles, folder structure |
| [understanding-flow](skills/understanding-flow/SKILL.md)                 | Architecture, composability, data flow          |
| [understanding-events](skills/understanding-events/SKILL.md)             | Event model, entity-action naming, properties   |
| [understanding-mapping](skills/understanding-mapping/SKILL.md)           | Event transformation, data/map/loop             |
| [understanding-destinations](skills/understanding-destinations/SKILL.md) | Destination interface, env pattern              |
| [understanding-sources](skills/understanding-sources/SKILL.md)           | Source interface, capture patterns              |

## Creating Things

| Task               | Skill                                                          |
| ------------------ | -------------------------------------------------------------- |
| Write tests        | [testing-strategy](skills/testing-strategy/SKILL.md)           |
| Create destination | [create-destination](skills/create-destination/SKILL.md)       |
| Create source      | [create-source](skills/create-source/SKILL.md)                 |
| Configure mappings | [mapping-configuration](skills/mapping-configuration/SKILL.md) |
| Debug event flow   | [debugging](skills/debugging/SKILL.md)                         |

## Package Navigation

```
packages/
├── core/           # Types, utilities, schemas (@walkeros/core)
├── collector/      # Event processing engine
├── config/         # Shared tooling config
├── web/            # Browser: sources/, destinations/
└── server/         # Node.js: sources/, destinations/

apps/
├── quickstart/     # Validated examples (source of truth)
├── walkerjs/       # Browser bundle
└── demos/          # Demo applications
```

## Key Files

| What                  | Where                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| Event types           | [packages/core/src/types/event.ts](packages/core/src/types/event.ts)             |
| Mapping functions     | [packages/core/src/mapping.ts](packages/core/src/mapping.ts)                     |
| Flow type             | [packages/collector/src/types/flow.ts](packages/collector/src/types/flow.ts)     |
| Destination interface | [packages/core/src/types/destination.ts](packages/core/src/types/destination.ts) |
| Source interface      | [packages/core/src/types/source.ts](packages/core/src/types/source.ts)           |
| Validated examples    | [apps/quickstart/](apps/quickstart/)                                             |

## Non-Negotiables

- **Event naming:** `"entity action"` format with space (`"page view"`, not
  `"page_view"`)
- **No `any`:** Never in production code
- **XP principles:** DRY, KISS, YAGNI, TDD
- **Test first:** Watch it fail before implementing
- **Verify:** Run tests before claiming complete
