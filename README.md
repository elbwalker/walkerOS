<p align="left">
  <a href="https://elbwalker.com">
  <img title="elbwalker" src='http://www.elbwalker.com/elbwalker.png' width="400px"/>
  </a>
</p>

<h2 align="left">walker.js</h2>

  <p align="left">The walker.js is an open-source data collection service. It makes it easy to capture user events in the browser for Google Tag Manager by setting HTML attributes only.
    <br />
    <a href="https://docs.elbwalker.com"><strong> Explore the docs</strong></a>
    <br />
    <br />
    <a href="https://calendly.com/elbwalker-demo/30min">Get a Demo</a>
    ·
    <a href="https://github.com/elbwalker/walker.js/issues/new">Report Bug</a>
    ·
    <a href="https://github.com/elbwalker/walker.js/issues/new">Request Feature</a>
  </p>
</div>

## 🤓 Usage

You can implement all sorts of front-end user events from e-commerce actions like product add to carts, product usage events, and UX events like visible elements, scrolling, etc. using the walker.

By setting just a few HTML attributes, you'll for example get something like this:

```js
dataLayer.push({
  event: 'product add',
  entity: 'product',
  action: 'add',
  data: {
    name: 'Everyday Ruck Snack',
    price: 220,
  },
  trigger: 'click',
  nested: [],
  elbwalker: true,
});
```

All you need to get started are the entity, action & trigger attributes.

```html
<!-- General usage -->
<div elb="ENTITY" elb-ENTITY="KEY:VALUE" elb-action="TRIGGER:ACTION" />
```

You define the entity scope by setting the `elb` attribute with the name of an entity to an element, e.g. `elb="product"`.
An action can be added by setting the `elb-action` attribute on the same level or all child elements in combination with a matching trigger, e.g. `elb-action="click:add"` to fire a <strong> product add </strong> event when a user clicks on the tagged element.
To define the entities' properties, set the composited attribute `elb-ENTITY` with the name and value, e.g. `elb-product="name:Everyday Ruck Snack;price:220"`.

```html
<div elb="product" elb-product="name:Everyday Ruck Snack;price:220">
  <button elb-action="click:add">Add to cart</button>
</div>
```

### Triggers

By using the walker.js you don't have to deal with event listener or mutation observer initialization anymore. The walker comes with a bunch of integrated triggers that will fire your event at the right moment.

<table>
  <tr>
    <th>Trigger</th>
    <th>Definiton</th>
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

_Learn more about the elbwalker [event model](https://www.elbwalker.com/blog/elbwalker-event-concept) and background in our [blog](https://www.elbwalker.com/blog/)._

## 🚀 Getting Started

To get a local copy up and running follow these simple steps.

### Prerequisites

- npm
  ```sh
  npm install npm@latest -g
  ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/elbwalker/walker.js.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
3. Start developing
   ```sh
   npm run dev
   ```

## 🛠 Contributing

Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make the walker better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 👩‍⚖️ License

Distributed under the MIT License. See LICENSE for more information.

## Contact

Send us an email if you have any questions or feedback at hello@elbwalker.com

Want to send the data directly to your Google BigQuery instance? Check out our hosted version at https://elbwalker.com/

<p align="right">(<a href="#top">back to top</a>)</p>
