<p align="left">
  <a href="https://elbwalker.com">
    <img title="elbwalker" src='https://www.elbwalker.com/elbwalker.png' width="300px"/>
  </a>
</p>

# walker.js

Walker.js is an open-source event tracker. Easy, standardized & flexible. With walker.js you can capture user events in the browser and send them to any destination - just by setting HTML attributes.
Become independent from locked-in analytics systems and set up reliable tracking the moment you design your front-end.

[**Explore the docs**](https://docs.elbwalker.com) · [Report Bug](https://github.com/elbwalker/walker.js/issues/new) · [Request Feature](https://github.com/elbwalker/walker.js/issues/new) · [Say hello](https://calendly.com/elb-alexander/30min)

## 🤓 Usage

You can implement all sorts of front-end user events easily with walker.js. From e-commerce actions like product add to carts or order complete events to product and UX events like navigation, or filter usage, etc.

Just set a few HTML attributes

```html
<!-- General usage -->
<div
  data-elb="ENTITY"
  data-elb-ENTITY="KEY:VALUE"
  data-elbaction="TRIGGER:ACTION"
/>

<!-- Example usage -->
<div
  data-elb="product"
  data-elb-product="name:Everyday Ruck Snack;price:220"
  data-elbaction="click:add"
/>
```

The result is for example something like this:

```js
dataLayer.push({
  event: 'product add', // combination of entity and action
  data: {
    // all set properties with the data-elb-product attribute
    name: 'Everyday Ruck Snack',
    price: 220,
  },
  globals: {
    // all set properties with the data-elbglobals attribute
    // Not shown in example usage snippet (data-elbglobals="language:en;test:darkmode")
    language: 'en',
    test: 'darkmode',
  },
  user: {
    // a stored random id in the cookie (manually added once)
    device: 'cookieid',
  },
  nested: [], // all nested entities within the product
  id: '1647968113641-01b5e2-5', // timestamp, group & count of the event
  trigger: 'click', // name of the trigger that fired
  entity: 'product', // entity name
  action: 'add', // entity action
  timestamp: 1647968113641, // time when the event fired
  timing: 13.37, // how long it took from the page load to trigger the event
  group: '01b5e2', // random group id for all events on a page
  count: 2, // incremental counter of the events on a page
  version: {
    // Helpful when working with raw data
    walker: 1.4, // used walker.js version
    config: 42, // a custom configuration version number
  },
  walker: true, // flag to filter events
});
```

You are completely free to define naming conventions. All you need to get started are the **entity, action & trigger attributes**. Learn more about the elbwalker [event model](https://www.elbwalker.com/blog/elbwalker-event-concept) and background in our [blog](https://www.elbwalker.com/blog/).

1. You define the entity scope by setting the `data-elb` attribute with the name of an entity to an element, e.g. `data-elb="product"`.
2. An action can be added by setting the `data-elbaction` attribute on the same level or all child elements in combination with a matching trigger, e.g. `data-elbaction="click:add"` to fire a _product add_ event when a user clicks on the tagged element.
3. (Optional) To define the entities' properties, set the composited attribute `data-elb-ENTITY` with the name and value, e.g. `data-elb-product="name:Everyday Ruck Snack;price:220"`.

```html
<body data-elbglobals="language:en;test:darkmode">
  <div data-elb="product">
    <h1 data-elb-product="name:Everyday Ruck Snack">Everyday Ruck Snack</h1>
    <p data-elb-product="price:220">Price: 220 Euro</p>
    <button data-elbaction="click:add">Add to cart</button>
  </div>
</body>
```

`data-elb`, `data-elbaction` and `data-elbglobals` are reserved attributes whereas `data-elb-` attributes may be arbitrary combinations based on the related entity name.
Actions and properties can be set anywhere inside an `elb` attribute.

> _See more 🧑‍🎓 [tagging examples](./examples) and learn how to tag your website._

## 🚀 Getting Started

Add the walker.js to your website and start tagging. Optionally you can specify destinations.

### Installation

Either use the walker.js via [npm](https://www.npmjs.com/package/@elbwalker/walker.js) as a project dependency

```sh
npm i @elbwalker/walker.js --save
```

Or as a script

```html
<script
  class="elbwalker"
  src="https://cdn.jsdelivr.net/npm/@elbwalker/walker.js@1.4/dist/walker.js"
></script>
```

### 🎬 Triggers

By using the walker.js you don't have to deal with event listener or mutation observer initialization anymore. The walker comes with a bunch of integrated triggers that will fire your event at the right moment.

```html
<!-- The trigger will fire the "product action" event -->
<b data-elb="product" data-elbaction="TRIGGER:action">...</b>
```

<table>
  <tr>
    <th>Trigger</th>
    <th>Definition</th>
  </tr>
  <tr>
    <td>load</td>
    <td>after loading a page when DOM is ready</td>
  </tr>
  <tr>
    <td>click</td>
    <td>when the element or a child is clicked</td>
  </tr>
  <tr>
    <td>visible</td>
    <td>after the element has been in viewport for at least 50% for one second</td>
  </tr>
  <tr>
    <td>submit</td>
    <td>on a valid form submission</td>
  </tr>
  <tr>
    <td>custom</td>
    <td>calling elbLayer.push()</td>
  </tr>
</table>

_For further inspiration, please refer to the industry examples in our [docs](https://docs.elbwalker.com/sources/web/industry-examples)._

### 🎯 Destinations

By default all events get pushed into the `dataLayer`, but you can customize the destinations. Walker.js comes with optional build-in destinations.

Example of adding a GA4 destination:

```js
import GA4 from './destinations/google-ga4'; // Load the destination
GA4.config.measurementId = 'G-XXXXXXX'; // Set all required properties
elbwalker.push('walker destination', GA4); // Add the destination
```

A destination has a `config` object and an optional `init` as well as the `push` function.
As soon as an event triggers the destinations init function gets called once so that all events will get sent to the additional destination now.

_See more examples, learn how to customize, or write your own in the [destinations deep dive](./src/destinations/)_.

## 🛠 Contributing

Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make walker.js better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Start developing

We highly recommend to follow the test driven development approach. Write your tests by specifying the expected input and output.

1. Install NPM packages
   ```sh
   npm install
   ```
2. Start developing
   ```sh
   npm run dev
   ```
3. Start developing
   ```sh
   npm run build
   ```
4. Be happy

## 👩‍⚖️ License

Distributed under the MIT License. See LICENSE for more information.

## Contact

Send us an email if you have any questions or feedback at hello@elbwalker.com

Want to send the data directly to your Google BigQuery instance? Check out our hosted version at https://elbwalker.com/

<p align="right">(<a href="#top">back to top</a>)</p>
