---
'@walkeros/server-destination-aws': minor
'@walkeros/cli': patch
'@walkeros/collector': patch
---

AWS destinations now deliver in bundled flows without extra setup. Firehose
batches by default, ends records with a newline (`newline: false` turns it off),
sends mapped `data` and accepts `config.credentials`. Rejected records now count
as failed. SNS works with `topicArn` alone and no longer creates topics at
start. `walkeros setup` resolves `$secret` values; partial batch failures log
their causes.
