---
'@walkeros/web-source-browser': minor
---

The browser source now supports a `data-elbuser` attribute to set persistent
user identity from the DOM. Tag any element with
`data-elbuser="id:u123;loggedin:true"` and the source applies it as collector
user state right before the page view, so the page view and every event after it
carry the user. Multiple elements merge, and an absent attribute leaves any
existing user untouched.
