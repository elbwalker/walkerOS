---
'@walkeros/web-source-session': patch
---

Single-page apps that call `walker run` on route changes no longer start a new
session on every route change. Session detection now runs once per page load;
storage mode still counts each run. Repeated consent updates no longer restart
the session either. Also stops a configured `domains` list from growing on every
run.
