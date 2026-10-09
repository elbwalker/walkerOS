# @walkeros/storybook-addon

## 4.8.0

### Patch Changes

- a4b03ba: The five event colours (globals, context, entity, property, action)
  now have a light-theme value that reads as text on light backgrounds. Their
  constants in `@walkeros/explorer/design` are now `{ dark, light }` objects,
  like every other themed colour; read `.dark` where the colour sits on a dark
  ground.
- d5cbc9c: Highlight colours now follow the walkerOS design system. Outlines on
  the story canvas, the highlight buttons and the attribute badges use the same
  event colours as the rest of walkerOS, and every outline carries a thin dark
  edge so it stays readable on light and dark stories.
- 7132619: The walkerOS panel takes its text sizes from the Storybook theme, so
  labels, highlight buttons and attribute badges match the rest of the Storybook
  UI.
- Updated dependencies [7132619]
- Updated dependencies [5593d7b]
- Updated dependencies [421233d]
  - @walkeros/core@4.8.0
  - @walkeros/collector@4.8.0
  - @walkeros/web-core@4.8.0
  - @walkeros/web-source-browser@4.8.0

## 4.7.2

### Patch Changes

- 98398fe: `startFlow` now types each step by the package passed as `code`, so
  settings, mapping rule settings and `env` keys autocomplete and an unknown
  setting is a type error; steps without typed code stay as loose as before. The
  Storybook addon no longer passes a `session` setting the browser source never
  had.
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [ff23953]
- Updated dependencies [ff23953]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
- Updated dependencies [98398fe]
  - @walkeros/core@4.7.2
  - @walkeros/web-core@4.7.2
  - @walkeros/web-source-browser@4.7.2
  - @walkeros/collector@4.7.2

## 4.7.1

### Patch Changes

- Updated dependencies [91e9aeb]
- Updated dependencies [0635330]
- Updated dependencies [0635330]
- Updated dependencies [91e9aeb]
- Updated dependencies [0635330]
  - @walkeros/web-core@4.7.1
  - @walkeros/web-source-browser@4.7.1
  - @walkeros/collector@4.7.1
  - @walkeros/core@4.7.1

## 4.7.0

### Patch Changes

- Updated dependencies [786a860]
- Updated dependencies [c9ea71f]
- Updated dependencies [ef02916]
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [7e5e3de]
- Updated dependencies [b9668bf]
- Updated dependencies [74821ed]
- Updated dependencies [64b06de]
- Updated dependencies [4b4937f]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [06b498a]
- Updated dependencies [74821ed]
- Updated dependencies [050d776]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [e860006]
- Updated dependencies [74821ed]
- Updated dependencies [74821ed]
- Updated dependencies [4f89234]
  - @walkeros/collector@4.7.0
  - @walkeros/web-source-browser@4.7.0
  - @walkeros/core@4.7.0
  - @walkeros/web-core@4.7.0

## 4.6.1

### Patch Changes

- @walkeros/collector@4.6.1
- @walkeros/core@4.6.1
- @walkeros/web-core@4.6.1
- @walkeros/web-source-browser@4.6.1

## 4.6.0

### Patch Changes

- Updated dependencies [8802281]
  - @walkeros/collector@4.6.0
  - @walkeros/web-source-browser@4.6.0
  - @walkeros/core@4.6.0
  - @walkeros/web-core@4.6.0

## 4.5.0

### Patch Changes

- Updated dependencies [63845bb]
- Updated dependencies [79cdcb0]
- Updated dependencies [756b571]
  - @walkeros/core@4.5.0
  - @walkeros/collector@4.5.0
  - @walkeros/web-core@4.5.0
  - @walkeros/web-source-browser@4.5.0

## 4.4.0

### Patch Changes

- Updated dependencies [393b942]
- Updated dependencies [6c89afb]
- Updated dependencies [393b942]
- Updated dependencies [35756dd]
- Updated dependencies [e896a7f]
- Updated dependencies [034b1de]
- Updated dependencies [d00e2bd]
- Updated dependencies [87937a8]
  - @walkeros/collector@4.4.0
  - @walkeros/core@4.4.0
  - @walkeros/web-source-browser@4.4.0
  - @walkeros/web-core@4.4.0

## 4.3.2

### Patch Changes

- @walkeros/collector@4.3.2
- @walkeros/core@4.3.2
- @walkeros/web-core@4.3.2
- @walkeros/web-source-browser@4.3.2

## 4.3.1

### Patch Changes

- Updated dependencies [f2030ab]
- Updated dependencies [2d6ab82]
- Updated dependencies [74eacdd]
  - @walkeros/core@4.3.1
  - @walkeros/collector@4.3.1
  - @walkeros/web-core@4.3.1
  - @walkeros/web-source-browser@4.3.1

## 4.3.0

### Patch Changes

- Updated dependencies [7527c41]
- Updated dependencies [9506e3e]
- Updated dependencies [ebd193f]
- Updated dependencies [e01036e]
- Updated dependencies [83ea3c6]
- Updated dependencies [66a8c33]
- Updated dependencies [e01036e]
- Updated dependencies [e01036e]
- Updated dependencies [98801c9]
- Updated dependencies [f8408fd]
- Updated dependencies [907eed0]
- Updated dependencies [9506e3e]
- Updated dependencies [d28a8ea]
- Updated dependencies [e6613f8]
- Updated dependencies [ebd193f]
  - @walkeros/web-source-browser@4.3.0
  - @walkeros/web-core@4.3.0
  - @walkeros/collector@4.3.0
  - @walkeros/core@4.3.0

## 4.2.1

### Patch Changes

- Updated dependencies [bd9188d]
- Updated dependencies [d8aebd1]
- Updated dependencies [5cbcd23]
- Updated dependencies [31c6858]
- Updated dependencies [d1b41ca]
- Updated dependencies [0a8a08b]
- Updated dependencies [8afb7cc]
- Updated dependencies [8afb7cc]
  - @walkeros/collector@4.2.1
  - @walkeros/core@4.2.1
  - @walkeros/web-source-browser@4.2.1
  - @walkeros/web-core@4.2.1

## 4.2.0

### Patch Changes

- 560d8af: The inspector now shows scoped (`data-elb_`) and generic
  (`data-elb-`) attributes resolved onto the entities that use them, labeled by
  origin, and scoped attributes are included in the visual property highlight.
  The three panel tabs are renamed to Events (N), Live Events (N), and Skeleton
  (N).
- Updated dependencies [76d32c1]
- Updated dependencies [5b1a134]
- Updated dependencies [5b1a134]
- Updated dependencies [908d6f0]
- Updated dependencies [654ba38]
- Updated dependencies [c27d3c1]
- Updated dependencies [e8f6909]
- Updated dependencies [f4a9013]
- Updated dependencies [d65bbde]
- Updated dependencies [d65bbde]
- Updated dependencies [e8f6909]
- Updated dependencies [776e5f9]
- Updated dependencies [c27d3c1]
- Updated dependencies [126c0f1]
- Updated dependencies [654ba38]
- Updated dependencies [21ac669]
- Updated dependencies [6a72a32]
- Updated dependencies [3eb2467]
- Updated dependencies [5b1a134]
- Updated dependencies [23d4b86]
- Updated dependencies [18c9469]
  - @walkeros/core@4.2.0
  - @walkeros/collector@4.2.0
  - @walkeros/web-source-browser@4.2.0
  - @walkeros/web-core@4.2.0

## 4.1.2

### Patch Changes

- Updated dependencies [b506f2c]
  - @walkeros/web-source-browser@4.1.2
  - @walkeros/collector@4.1.2
  - @walkeros/core@4.1.2
  - @walkeros/web-core@4.1.2

## 4.1.1

### Patch Changes

- 79fe0cc: Fix latent type errors in Panel props and attribute tree builder, and
  enable `typecheck` script so the package participates in CI type coverage.
- Updated dependencies [b0279ee]
- Updated dependencies [b0279ee]
- Updated dependencies [0b7f494]
- Updated dependencies [edd3836]
- Updated dependencies [edd3836]
  - @walkeros/core@4.1.1
  - @walkeros/collector@4.1.1
  - @walkeros/web-core@4.1.1
  - @walkeros/web-source-browser@4.1.1

## 4.1.0

### Patch Changes

- Updated dependencies [e155ff8]
- Updated dependencies [e800974]
- Updated dependencies [e155ff8]
- Updated dependencies [1a8f2d7]
- Updated dependencies [1a8f2d7]
- Updated dependencies [b276173]
- Updated dependencies [dd9f5ad]
- Updated dependencies [c60ef35]
- Updated dependencies [adeebea]
- Updated dependencies [13aaeaa]
- Updated dependencies [e800974]
- Updated dependencies [adeebea]
- Updated dependencies [6cdc362]
- Updated dependencies [e800974]
- Updated dependencies [e800974]
- Updated dependencies [058f7ed]
- Updated dependencies [28a8ac2]
- Updated dependencies [fd6076e]
  - @walkeros/core@4.1.0
  - @walkeros/collector@4.1.0
  - @walkeros/web-source-browser@4.1.0
  - @walkeros/web-core@4.1.0

## 4.0.2

### Patch Changes

- Updated dependencies [a6a0ea7]
  - @walkeros/core@4.0.2
  - @walkeros/collector@4.0.2
  - @walkeros/web-core@4.0.2
  - @walkeros/web-source-browser@4.0.2

## 4.0.1

### Patch Changes

- Updated dependencies [cb265eb]
- Updated dependencies [381dfe7]
- Updated dependencies [1524275]
- Updated dependencies [03d7055]
  - @walkeros/collector@4.0.1
  - @walkeros/core@4.0.1
  - @walkeros/web-source-browser@4.0.1
  - @walkeros/web-core@4.0.1

## 4.0.0

### Patch Changes

- Updated dependencies [93ea9c4]
- Updated dependencies [465775c]
- Updated dependencies [942a7fe]
- Updated dependencies [cfc7469]
- Updated dependencies [8e06b1f]
- Updated dependencies [3d50dd6]
- Updated dependencies [1ef33d9]
  - @walkeros/core@4.0.0
  - @walkeros/collector@4.0.0
  - @walkeros/web-source-browser@4.0.0
  - @walkeros/web-core@4.0.0

## 3.4.2

### Patch Changes

- @walkeros/collector@3.4.2
- @walkeros/core@3.4.2
- @walkeros/web-core@3.4.2
- @walkeros/web-source-browser@3.4.2

## 3.4.1

### Patch Changes

- Updated dependencies [12adf24]
- Updated dependencies [75aa26b]
- Updated dependencies [caea905]
  - @walkeros/core@3.4.1
  - @walkeros/collector@3.4.1
  - @walkeros/web-core@3.4.1
  - @walkeros/web-source-browser@3.4.1

## 3.4.0

### Patch Changes

- Updated dependencies [74940cc]
- Updated dependencies [724f97e]
- Updated dependencies [525f5d9]
  - @walkeros/core@3.4.0
  - @walkeros/web-source-browser@3.4.0
  - @walkeros/collector@3.4.0
  - @walkeros/web-core@3.4.0

## 3.3.1

### Patch Changes

- Updated dependencies [b10144a]
- Updated dependencies [206185a]
- Updated dependencies [50e5d09]
- Updated dependencies [32ff626]
  - @walkeros/collector@3.3.1
  - @walkeros/web-source-browser@3.3.1
  - @walkeros/core@3.3.1
  - @walkeros/web-core@3.3.1

## 3.3.0

### Patch Changes

- Updated dependencies [2849acb]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
- Updated dependencies [08c365a]
  - @walkeros/core@3.3.0
  - @walkeros/collector@3.3.0
  - @walkeros/web-core@3.3.0
  - @walkeros/web-source-browser@3.3.0

## 3.2.0

### Patch Changes

- Updated dependencies [eb865e1]
- Updated dependencies [c0a53f9]
- Updated dependencies [8cdc0bb]
- Updated dependencies [f007c9f]
- Updated dependencies [bf2dc5b]
- Updated dependencies [da0b640]
- Updated dependencies [a5d25bc]
- Updated dependencies [9a99298]
- Updated dependencies [884527d]
  - @walkeros/core@3.2.0
  - @walkeros/collector@3.2.0
  - @walkeros/web-core@3.2.0
  - @walkeros/web-source-browser@3.2.0

## 3.1.1

### Patch Changes

- @walkeros/core@3.1.1
- @walkeros/collector@3.1.1
- @walkeros/web-core@3.1.1
- @walkeros/web-source-browser@3.1.1

## 3.1.0

### Patch Changes

- Updated dependencies [a9149e4]
- Updated dependencies [ff58828]
- Updated dependencies [dfc6738]
- Updated dependencies [966342b]
- Updated dependencies [bee8ba7]
- Updated dependencies [966342b]
- Updated dependencies [df990d4]
  - @walkeros/web-source-browser@3.1.0
  - @walkeros/collector@3.1.0
  - @walkeros/web-core@3.1.0
  - @walkeros/core@3.1.0

## 3.0.2

### Patch Changes

- @walkeros/core@3.0.2
- @walkeros/collector@3.0.2
- @walkeros/web-core@3.0.2
- @walkeros/web-source-browser@3.0.2

## 3.0.1

### Patch Changes

- @walkeros/core@3.0.1
- @walkeros/collector@3.0.1
- @walkeros/web-core@3.0.1
- @walkeros/web-source-browser@3.0.1

## 3.0.0

### Patch Changes

- 0df350d: Update @walkeros/web-source-browser dependency to include shadow DOM
  support
- Updated dependencies [2b259b6]
- Updated dependencies [2614014]
- Updated dependencies [6ae0ee3]
- Updated dependencies [37299a9]
- Updated dependencies [499e27a]
- Updated dependencies [499e27a]
- Updated dependencies [0e5eede]
- Updated dependencies [d11f574]
- Updated dependencies [d11f574]
- Updated dependencies [1fe337a]
- Updated dependencies [5cb84c1]
- Updated dependencies [23f218a]
- Updated dependencies [a30095c]
- Updated dependencies [499e27a]
- Updated dependencies [c83d909]
- Updated dependencies [a2aa491]
- Updated dependencies [b6c8fa8]
  - @walkeros/core@3.0.0
  - @walkeros/collector@3.0.0
  - @walkeros/web-source-browser@3.0.0
  - @walkeros/web-core@3.0.0

## 2.1.1

### Patch Changes

- Updated dependencies [fab477d]
  - @walkeros/core@2.1.1
  - @walkeros/collector@2.1.1
  - @walkeros/web-core@2.1.1
  - @walkeros/web-source-browser@2.1.1

## 2.1.0

### Patch Changes

- Updated dependencies [7fc4cee]
- Updated dependencies [7fc4cee]
- Updated dependencies [cb2da05]
- Updated dependencies [2bbe8c8]
- Updated dependencies [3eb6416]
- Updated dependencies [02a7958]
- Updated dependencies [60f0a1c]
- Updated dependencies [97df0b2]
- Updated dependencies [97df0b2]
- Updated dependencies [026c412]
- Updated dependencies [7d38d9d]
  - @walkeros/core@2.1.0
  - @walkeros/collector@2.1.0
  - @walkeros/web-source-browser@2.1.0
  - @walkeros/web-core@2.1.0

## 2.0.1

## 1.0.6

### Patch Changes

- Updated dependencies [e7914fb]
- Updated dependencies [32bfc92]
- Updated dependencies [7b2d750]
  - @walkeros/web-source-browser@1.1.4
  - @walkeros/collector@2.0.0
  - @walkeros/core@1.4.0
  - @walkeros/web-core@2.0.0

## 1.0.5

### Patch Changes

- Updated dependencies [a4cc1ea]
- Updated dependencies [9599e60]
- Updated dependencies [e9c9faa]
  - @walkeros/core@1.3.0
  - @walkeros/collector@1.2.0
  - @walkeros/web-core@1.0.5
  - @walkeros/web-source-browser@1.1.3

## 1.0.4

### Patch Changes

- Updated dependencies [7ad6cfb]
  - @walkeros/collector@1.1.2
  - @walkeros/core@1.2.2
  - @walkeros/web-source-browser@1.1.2
  - @walkeros/web-core@1.0.4

## 1.0.3

### Patch Changes

- Updated dependencies [6256c12]
  - @walkeros/core@1.2.1
  - @walkeros/collector@1.1.1
  - @walkeros/web-core@1.0.3
  - @walkeros/web-source-browser@1.1.1

## 1.0.2

### Patch Changes

- Updated dependencies [f39d9fb]
- Updated dependencies [888bbdf]
- Updated dependencies [a38d791]
  - @walkeros/collector@1.1.0
  - @walkeros/core@1.2.0
  - @walkeros/web-source-browser@1.1.0
  - @walkeros/web-core@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [b65b773]
- Updated dependencies [20eca6e]
  - @walkeros/collector@1.0.1
  - @walkeros/core@1.1.0
  - @walkeros/web-source-browser@1.0.1
  - @walkeros/web-core@1.0.1

## 1.0.0

### Major Changes

- 67c9e1d: Hello World! walkerOS v1.0.0

  Open-source event data collection. Collect event data for digital analytics in
  a unified and privacy-centric way.

### Patch Changes

- Updated dependencies [67c9e1d]
  - @walkeros/collector@1.0.0
  - @walkeros/core@1.0.0
  - @walkeros/web-core@1.0.0
  - @walkeros/web-source-browser@1.0.0
