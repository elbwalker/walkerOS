---
'@walkeros/cli': minor
---

Make --simulate consistent across all step types. Before chain always runs as
mandatory preparation. Next chain is skipped. No other steps execute. Source
simulation now captures at collector.push boundary instead of env.push,
preserving the before chain.
