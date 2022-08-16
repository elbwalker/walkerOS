import React from 'react';
import { ButtonPrimary, ButtonSecondary } from '../atoms/button';

export default function CTA({ title, description, position }) {
  return (
    <div
      data-elb="cta"
      data-elbaction="visible"
      data-elb-cta={'goal:trial' + (position ? `;position:${position}` : '')}
      className="max-w-7xl mx-auto text-center py-12 px-4 sm:px-6 lg:py-16 lg:px-8"
    >
      <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
        <span data-elb-cta={`title:${title}`} className="block">
          {title}
        </span>
        <span className="block">{description}</span>
      </h2>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-md shadow">
          <ButtonPrimary label="Get started" action={'start'} />
        </div>
        <div className="ml-3 inline-flex">
          <ButtonSecondary label="Learn more" action={'learn'} />
        </div>
      </div>
    </div>
  );
}
