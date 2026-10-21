---
'@walkeros/core': patch
---

A JSON log line above 32 KiB now truncates its message as well as its context
and sets `messageTruncated: true`, so one oversized line can no longer break a
log pipeline. Mapping problems report under the step `mapping.<rule>`, one line
per rule.
