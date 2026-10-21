---
'@walkeros/server-destination-sqlite': patch
---

The table check and the prepared insert run at the first push, so a flow starts
without querying the database. A missing table fails the push with the setup
hint, and a failed INSERT fails the push instead of being logged and counted
delivered.
