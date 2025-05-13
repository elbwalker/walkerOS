import { JSX } from 'react';
import Layout from '@theme/Layout';
import EventFlow from '@site/src/components/organisms/eventFlow';
import '@site/src/css/event-flow.scss';

const exampleCode = `<div
  data-elb="product"
  data-elbaction="load:view"
  data-elbcontext="stage:inspire"
  class="event-flow dui-card w-80 bg-base-100 shadow-xl mx-auto">
  <figure class="relative">
    <img src="/img/examples/everyday_ruck_snack.png" alt="Product" />
    <div class="absolute top-2 right-2">
      <div data-elb-product="badge:delicious" class="dui-badge dui-badge-primary text-white">delicious</div>
    </div>
  </figure>
  <div class="dui-card-body">
    <h3 data-elb-product="name:#innerText" class="dui-card-title text-lg">
      Everyday Ruck Snack
    </h3>
    <div class="dui-form-control">
      <label class="dui-label">Taste</label>
      <select 
        data-elb-product="taste:#value"
        class="dui-select dui-select-bordered w-full"
      >
        <option value="sweet">Sweet</option>
        <option value="spicy">Spicy</option>
      </select>
    </div>
    <p data-elb-product="price:2.50" class="text-xl font-bold">
      € 2.50 <span data-elb-product="old_price:3.14" class="dui-label text-base line-through">€ 3.14</span>
    </p>
    <div class="dui-card-actions justify-end">
      <button
        data-elbaction="click:add"
        data-elbcontext="stage:hooked"
        class="dui-btn dui-btn-primary text-white"
      >
        Add to Cart
      </button>
    </div>
  </div>
</div>`;

export default function EventFlowPage(): JSX.Element {
  return (
    <Layout title="Event Flow" description="Test the event flow component">
      <EventFlow
        code={exampleCode}
        mapping={`{
  product: {
    view: {
      name: 'view_item',
      data: {
        map: {
          event: 'event',
          price: 'data.price',
          stage: "context.stage.0"
        },
      },
    },
    add: {
      name: 'add_to_cart',
      data: {
        map: {
          event: 'event',
          price: 'data.price',
          user: {
            consent: { marketing: true },
            key: 'user.session'
          },
          isSale: {
            fn: (e) => !!e.data.old_price
          },
        },
      },
    },
  },
}`}
        height="640px"
        previewId="event-flow"
        eventFn={(event) => {
          delete event.custom;
          return event;
        }}
        resultFn={(output) => {
          return `dataLayer.push(${JSON.stringify(output, null, 2)});`;
        }}
      />
    </Layout>
  );
}
