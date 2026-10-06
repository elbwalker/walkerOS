---
'@walkeros/server-source-express': patch
---

Requests to a path or method that is not configured now get a JSON 404
(`{ "success": false, "error": "Not found" }`) instead of the Express HTML page,
which named the framework and echoed the requested path.
