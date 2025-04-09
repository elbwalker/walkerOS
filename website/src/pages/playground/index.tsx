import { JSX, useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import Layout from '@theme/Layout';
import Tagging from '@site/src/components/organisms/tagging';

interface Registry {
  id: string;
  name: string;
  code: string;
  fn?: (event: any) => any;
}

const registry: Registry[] = [
  {
    id: 'promotion',
    name: 'Promotion',
    code: `<div
  data-elb="promotion"
  data-elbaction="visible"
  data-elbcontext="playground:tagging"
  class="dui-hero p-4"
>
  <div class="dui-hero-content max-w-md text-center">
    <div data-elbcontext="stage:interested" class="max-w-md">
      <h2 data-elb-promotion="name:#innerText" class="text-xl font-bold">
        Quick and simple tracking setup
      </h2>
      <p class="py-6">Seeing me triggers a visible event after a second.</p>
      <button data-elbaction="click:primary" class="dui-btn dui-btn-primary">
        Click me
      </button>
      <button data-elbaction="click:secondary" class="dui-btn">
        Or me
      </button>
    </div>
  </div>
</div>`,
    fn: (event) => {
      delete event.globals;
      delete event.custom;
      delete event.user;
      delete event.nested;
      delete event.consent;
      delete event.version;
      return event;
    },
  },
  {
    id: 'product',
    name: 'Product',
    code: `<div data-elb="product" data-elbaction="load:view" class="dui-card w-96 bg-base-100 shadow-xl">
  <figure><img src="https://placehold.co/400x300" alt="Product" /></figure>
  <div class="dui-card-body">
    <h2 data-elb-product="name:#innerText" class="dui-card-title">Product Name</h2>
    <p data-elb-product="description:#innerText">Product description goes here</p>
    <div class="dui-card-actions justify-end">
      <button data-elbaction="click:add" class="dui-btn dui-btn-primary">Add to Cart</button>
    </div>
  </div>
</div>`,
    fn: (event) => {
      delete event.globals;
      delete event.custom;
      return event;
    },
  },
];

export default function Playground(): JSX.Element {
  const location = useLocation();
  const [selectedExample, setSelectedExample] = useState<Registry>(registry[0]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      const example = registry.find((item) => item.id === id);
      if (example) {
        setSelectedExample(example);
      }
    }
  }, [location]);

  const handleExampleSelect = (example: Registry) => {
    setSelectedExample(example);
    window.history.pushState({}, '', `?id=${example.id}`);
  };

  return (
    <Layout title="Playground" description="Learn how to use walkerOS">
      <div className="flex flex-wrap gap-2 m-4">
        {registry.map((example) => (
          <button
            key={example.id}
            className={`dui-btn ${selectedExample.id === example.id ? 'dui-btn-primary' : 'dui-btn-outline'}`}
            onClick={() => handleExampleSelect(example)}
          >
            {example.name}
          </button>
        ))}
      </div>
      <Tagging
        previewId={selectedExample.id}
        height="640px"
        code={selectedExample.code}
        fn={selectedExample.fn}
      />
    </Layout>
  );
}
