---
'@walkeros/web-source-browser': minor
'@walkeros/mcp-source-browser': minor
---

Add the `data-elb_` scoped generic attribute. It carries the same `key:value`
properties as the blanket `data-elb-` generic, but only events whose triggered
element is nested below the `data-elb_` element receive them. The
`createTagger()` API gains a `scoped()` method and the `generate_tagging` MCP
tool gains a `scoped` input to produce it. Use `data-elb-` for properties every
trigger in an entity should carry, and `data-elb_` when only triggers within a
specific branch should.
