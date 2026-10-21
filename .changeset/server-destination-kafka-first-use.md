---
'@walkeros/server-destination-kafka': patch
---

The producer connects at the first push, so a flow starts without a reachable
broker. A failed send fails the push instead of being logged and counted
delivered; an unknown topic is a `config` error with the setup hint. Rules with
`silent: true` send nothing.
