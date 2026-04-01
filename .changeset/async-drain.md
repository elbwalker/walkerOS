---
'@walkeros/cli': minor
---

Add custom async drain for simulation. Timer interception captures setTimeout/setInterval callbacks, flush() executes them deterministically with microtask draining between passes. Handles detached Promise chains (source click handlers), debounced batches (destination batching), and nested timer patterns.
