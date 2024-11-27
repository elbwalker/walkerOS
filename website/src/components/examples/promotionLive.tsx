import React from 'react';
import Preview from '../preview/preview';

const code = `<div
  data-elb="promotion"
  data-elbaction="visible:view"
  data-elb-promotion="category:analytics"
  className="hero bg-base-200 p-4"
>
  <div className="hero-content max-w-md text-center">
    <div className="max-w-md">
      <h2 data-elb-promotion="name:#innerText" className="text-xl font-bold">
        Setting up tracking easily
      </h2>
      <p className="py-6">
        Provident cupiditate voluptatem et in.
      </p>
      <button data-elbaction="click:start" className="btn btn-primary">
        Get Started
      </button>
      <button data-elbaction="click:more" className="btn">
        Learn more
      </button>
    </div>
  </div>
</div>;
`.trim();

const PromotionLive: React.FC = () => {
  return (
    <div className="my-8">
      <Preview code={code} />
    </div>
  );
};

export default PromotionLive;
