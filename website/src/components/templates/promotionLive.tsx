import React from 'react';
import Tagging from '@site/src/components/organisms/tagging';
import {
  TypeEdit,
  EditMode,
} from '@site/src/components/molecules/typewriterCode';

const baseCode = `<div
  class="dui-hero p-4"
>
  <div class="dui-hero-content max-w-md text-center">
    <div class="max-w-md">
      <h2 class="text-xl font-bold">
        Setting up tracking easily
      </h2>
      <p class="py-6">
       Click a button to trigger more events.      </p>
      <button class="dui-btn dui-btn-primary">
        Get Started
      </button>
      <button class="dui-btn">
        Learn more
      </button>
    </div>
  </div>
</div>`;

const typewriterEdits: TypeEdit[] = [
  {
    line: 1,
    position: 2,
    content: 'data-elb="promotion"',
    delay: 200,
    mode: EditMode.NEW,
  },
  {
    line: 2,
    position: 2,
    content: 'data-elbaction="visible"',
    delay: 1,
    mode: EditMode.NEW,
  },
  {
    line: 3,
    position: 2,
    content: 'data-elb-promotion="category:analytics"',
    delay: 1,
    mode: EditMode.NEW,
  },
  {
    line: 4,
    position: 2,
    content: 'data-elbcontext="test:live_demo"',
    delay: 1,
    mode: EditMode.NEW,
  },
  {
    line: 9,
    position: 9,
    content: ' data-elb-promotion="name:#innerText"',
    delay: 1,
    mode: EditMode.INSERT,
  },
  {
    line: 15,
    position: 13,
    content: ' data-elbaction="click:start"',
    delay: 300,
    mode: EditMode.INSERT,
  },
  {
    line: 18,
    position: 13,
    content: ' data-elbaction="click:more"',
    delay: 300,
    mode: EditMode.INSERT,
  },
];

export const PromotionLive: React.FC = () => {
  return (
    <div className="my-8">
      <Tagging
        code={baseCode}
        height="530px"
        typewriter={{
          edits: typewriterEdits,
          typingSpeed: 30,
        }}
      />
    </div>
  );
};

export const PromotionReady: React.FC = () => {
  return (
    <div className="my-8">
      <Tagging
        previewId="ready"
        fn={(event) => {
          delete event.globals;
          delete event.custom;
          delete event.user;
          delete event.nested;
          delete event.consent;
          delete event.version;
          return event;
        }}
        height="640px"
        code={`<div
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
</div>;
`}
      />
    </div>
  );
};
