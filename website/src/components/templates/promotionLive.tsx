import React from 'react';
import Tagging from '../organisms/tagging';
import { TypeEdit, EditMode } from '../molecules/typewriterCode';

const baseCode = `<div
  class="dui-hero p-4"
>
  <div class="dui-hero-content max-w-md text-center">
    <div class="max-w-md">
      <h2 class="text-xl font-bold">
        Setting up tracking easily
      </h2>
      <p class="py-6">
        Provident cupiditate voluptatem et in.
      </p>
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

const PromotionLive: React.FC = () => {
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
        height="530px"
        code={`<div
    data-elb="promotion"
    data-elbaction="visible"
    data-elb-promotion="category:analytics"
    data-elbcontext="test:live_demo"
    class="dui-hero p-4"
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
  </div>`}
      />
    </div>
  );
};

export default PromotionLive;
