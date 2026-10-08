---
'@walkeros/explorer': patch
---

`@walkeros/explorer/design/components` gains `BrowserFrame`, a browser window on
the site theme around any page: an address field with the URL, an optional
reload button, a slot for the caller's actions and an optional bookmarks row
that marks the current page. It is sized by its caller and styled by
`@walkeros/explorer/styles.css`. `Icon` gains `lock`, `reload` and `bookmark`.
