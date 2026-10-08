---
'@walkeros/explorer': patch
'@walkeros/storybook-addon': patch
---

The five event colours (globals, context, entity, property, action) now have a
light-theme value that reads as text on light backgrounds. Their constants in
`@walkeros/explorer/design` are now `{ dark, light }` objects, like every other
themed colour; read `.dark` where the colour sits on a dark ground.
