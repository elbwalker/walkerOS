---
'@walkeros/mcp': patch
---

`flow_examples` reads a step's package examples at the version or local path the
flow pins, the package `flow_bundle` installs, and names that version on each
package example. A step whose package cannot be read is listed in the warnings
instead of being left out unseen.
