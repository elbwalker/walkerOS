import { JSX } from 'react';
import Layout from '@theme/Layout';
import EventFlow from '@site/src/components/organisms/eventFlow';

const exampleCode = `<div
  data-elb="product"
  data-elbaction="load:view"
  data-elbcontext="stage:inspire"
  class="dui-card w-80 bg-base-100 shadow-xl mx-auto"
>
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
    <p data-elb-product="description:#innerText">
      Product description goes here
    </p>
    <p data-elb-product="price:2.50" class="text-xl font-bold">
      € 2.50 <span data-elb-product="old_price:3.14" class="text-base text-base-300 line-through">€ 3.14</span>
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
        mapping={{
          product: {
            view: {
              name: 'view_item',
              data: {
                map: {
                  event: 'event',
                  price: { value: '100' },
                },
              },
            },
            add: {
              name: 'add_to_cart',
              data: {
                map: {
                  event: 'event',
                  price: { value: '100' },
                },
              },
            },
          },
        }}
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
