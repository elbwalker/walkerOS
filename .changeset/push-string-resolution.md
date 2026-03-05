---
'@walkeros/cli': patch
---

Standardize command pattern: all three commands (validate, simulate, push) now
route through their programmatic APIs for string resolution and orchestration.
Extract shared createCollectorLoggerConfig utility. Pass missing silent/step
options through simulate() API.
