import React from 'react';
import { Button } from '../atoms/buttons';

export default function Hero() {
  const CheckSVG = ({ children }) => (
    <span className="text-s mx-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 font-medium">
      <svg
        aria-hidden="true"
        className="h-4 w-4 mr-1"
        fill="#34d399"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        ></path>
      </svg>
      {children}
    </span>
  );

  return (
    <main className="relative mx-3 mt-16 max-w-7xl sm:mt-24 lg:mx-auto">
      <div className="text-center	">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          <div className="block text-elbwalker block">walkerOS</div>
          <div className="block xl:inline text-black dark:text-white">
            Open-source event data collection
          </div>
        </h1>
        <p className="mx-auto mt-3 text-base sm:text-lg md:mt-5 md:text-xl">
          Collect event data for digital analytics in a unified and
          privacy-centric way.
        </p>
        <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
          <Button link="/docs/getting_started/quick_start">Get started</Button>
          <Button
            link="https://tagging.demo.elbwalker.com/"
            variant="secondary"
          >
            Playground
          </Button>
        </div>
      </div>
      <div className="mt-10 text-center">
        <CheckSVG>runs in your own infrastructure</CheckSVG>
        <CheckSVG>integrates with various analytics & marketing tools</CheckSVG>
        <CheckSVG>in-built consent mode</CheckSVG>
      </div>
    </main>
  );
}
