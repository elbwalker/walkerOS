---
title: What is walker.js?
desription: Walker.js is an open library to capture user events and send them to any analytics tool. It was created to enable data ownership, improve web data quality, and scale tracking implementation processes.
---
## Introducing walker.js

Walker.js is an implementation layer that creates reliable event data with context. It adds maximum <b>ownership</b> and <b>scalability</b> to your web-tracking implementation. 
 If you...

- take the users' privacy seriously and want to track <b>first-party</b>
- <b>regularly ship new features</b> and landing pages and constantly need to make sure you added the tracking correctly
- have a continuously growing user interface and you find measuring <b>in-depth behavioral data</b> on the usage difficult to implement

... <b>walker.js</b> might be just what you're looking for.

### Coupled with markup (like CSS)

We're building upon data attributes instead of writing manual code. Yes, this means that in general, you can only measure what your users really see, click, and do on your website or within your web app. What's not in your markup can't be measured with the walker.js. 
This is because in most of the cases where tracking code breaks it happens when the UI is being changed or further developed and nobody thought about the tracking. It's often too far away from the core product development. It's much less likely to remove attributes that are used throughout the whole markup. Somebody will at least ask what they are and do.

### Based on an Entity+Action event model

One of the great things about elbwalker is the full flexibility of event definitions. You can build your tracking based on your business logic instead of trying to press your business logic into analytics specs. 
We believe that tracking shouldn't sound like some abstract technical concept. It should feel natural and everyone involved should immediately understand it. Only when everyone understands what is being measured, there will be fewer misunderstandings, higher data quality, and more actionable data in the organization at the end of the day.
An elbwalker event consists of three components: a trigger (e.g. load), an entity (e.g. page), and an action (e.g. view).

### Vendor-agnostic

Walker.js is generally not made to replace any of your tools, but to deliver them better data. One event captured with walker.js can be sent to many destinations at the same time. However, if you want to replace analytic tools like Google Analytics you can do this by using walker.js and the event pipe destination. 