---
'@walkeros/mcp-source-browser': patch
---

`validate_tagging` reads actions with the browser source's own parser and knows
every trigger it handles, so `scroll(50):read`, `custom` and quoted action
params no longer warn, and it checks both `data-elbaction` and `data-elbactions`
on one element. `generate_tagging` refuses a `link` with more than one entry.
