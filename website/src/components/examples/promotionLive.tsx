import React from 'react';
import Preview from '../preview/preview';

const code = `
    <div
      data-elb="promotion"
      data-elbaction="visible:view"
      data-elb-promotion="category:analytics"
      className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16"
    >
      <h2
        data-elb-promotion="name:#innerText"
        className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-white"
      >
        Setting up tracking easily
      </h2>
      <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
        Incididunt sint fugiat pariatur cupidatat consectetur sit cillum anim id
        veniam aliqua proident excepteur commodo do ea.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <a
          href="#"
          onClick={() => { 
  console.log({foo: "asd"});      
}}
          data-elbaction="click:start"
          className="rounded-md bg-white px-3.5 py-1.5 text-base font-semibold leading-7 text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Get started
        </a>
        <a
          href="#"
          data-elbaction="click:more"
          className="text-base font-semibold leading-7 text-white"
        >
          Learn more <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
`;

const PromotionLive: React.FC = () => {
  return (
    <div className="my-8">
      <Preview code={code} />
    </div>
  );
};

export default PromotionLive;
