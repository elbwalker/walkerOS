import { JSX } from 'react';
import Layout from '@theme/Layout';
import EventFlow from '@site/src/components/organisms/eventFlow';
import { destinationWebAPI } from '@elbwalker/destination-web-api';

const exampleCode = `<div
  data-elb="product"
  data-elbaction="load:visible"
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
        height="640px"
        previewId="event-flow"
        fn={(event) => {
          delete event.globals;
          delete event.custom;
          return event;
        }}
        destination={destinationWebAPI}
        initialConfig={{
          custom: {
            url: 'https://moin.p.elbwalkerapis.com/lama',
            transform: (event) => {
              return JSON.stringify({
                ...event,
                ...{
                  projectId: 'RQGM6XJ',
                },
              });
            },
            transport: 'xhr',
          },
        }}
      />
    </Layout>
  );
} 