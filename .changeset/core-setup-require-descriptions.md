---
'@walkeros/core': patch
---

Schema descriptions now match the behaviour: `setup` on destinations, stores and
flow steps runs only through `walkeros setup`; an event cache's `stop` defaults
to true on sources, and `update` changes only a source's response, on HIT and
MISS. They appear in the flow JSON Schema and in MCP.
