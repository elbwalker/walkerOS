import React from 'react';
import Preview from '../preview/preview';

const code = `<div
  data-elb="promotion"
  data-elbaction="visible:view"
  data-elb-promotion="category:analytics"
  data-elbcontext="test:live_demo"
  class="dui-hero bg-base-200 p-4"
>
  <div class="dui-hero-content max-w-md text-center">
    <div class="max-w-md">
      <h2 data-elb-promotion="name:#innerText" class="text-xl font-bold">
        Setting up tracking easily
      </h2>
      <p class="py-6">
        Provident cupiditate voluptatem et in.
      </p>
      <button data-elbaction="click:start" class="dui-btn dui-btn-primary">
        Get Started
      </button>
      <button data-elbaction="click:more" class="dui-btn">
        Learn more
      </button>
    </div>
  </div>
</div>;
`;

const PromotionLive: React.FC = () => {
  return (
    <div className="my-8">
      <Preview code={code} />
    </div>
  );
};

export default PromotionLive;
