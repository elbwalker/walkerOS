import React from 'react';
import Tagging from '../organisms/tagging';
import { TypeEdit, EditMode } from '../molecules/typewriterCode';

const baseCode = `<div
  class="dui-hero bg-base-200 p-4"
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
    content: 'data-elbaction="click"',
    delay: 100,
    mode: EditMode.NEW,
  },
  {
    line: 7,
    position: 9,
    content: ' data-elb-promotion="name:#innerText"',
    delay: 300,
    mode: EditMode.INSERT,
  },
];

const PromotionLive: React.FC = () => {
  return (
    <div className="my-8">
      <Tagging
        code={baseCode}
        typewriter={{
          edits: typewriterEdits,
          typingSpeed: 30,
        }}
      />
    </div>
  );
};

export default PromotionLive;
