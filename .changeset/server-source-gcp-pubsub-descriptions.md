---
'@walkeros/server-source-gcp': patch
---

The Pub/Sub `decoder` descriptions say what `text` and `raw` forward and that
those events need a before transformer that sets the event name, otherwise the
collector rejects them. The setup `ackDeadlineSeconds` description states that
an unset value leaves Pub/Sub's own default of 10 seconds. The push `projectId`
description no longer claims the value appears in error messages.
