---
'@walkeros/explorer': minor
---

Add a unified tag visualization: the `Tag` atom plus `TagCanvas` and
`TagTreeEditor`. It renders walkerOS data-elb tagging as nested rectangles
(entity, context, global, action, property) with an auto-laid-out reading view
and an overlay you can draw onto a screenshot. The overlay editor supports
dragging and resizing rectangles, keeping every tag fully nested or fully
separate. The existing `TagSkeleton` and `TagSkeletonOverlay` continue to work.
