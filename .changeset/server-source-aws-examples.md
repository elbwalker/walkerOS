---
'@walkeros/server-source-aws': patch
---

The SQS examples now send `name` in the message body; with `event` the collector
rejected every message as an event without a name, and it was deleted. The
Lambda GET example uses `name` and `data[...]` query parameters. The SQS
`decoder` description says that `text` and `raw` forward the body as
`data.payload` and need a before transformer that sets the name.
