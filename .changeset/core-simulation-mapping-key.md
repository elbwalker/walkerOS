---
'@walkeros/core': patch
---

Simulation step results gain an optional `mappingKey` field reporting the
entity-action key of the mapping rule a destination matched during simulation.
The field is additive and present only when a rule matched.
