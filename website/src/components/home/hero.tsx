import React from 'react';
import { Button } from '../atoms/buttons';

export default function Hero() {
  return (
    <main className="relative mx-3 mt-16 max-w-7xl sm:mt-24 lg:mx-auto">
      <div className="text-center	">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          <span className="block text-elbwalker-600 xl:inline">walkerOS</span>
          <div className="block xl:inline text-black dark:text-white">
            Your Data Collection Solution
          </div>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base sm:text-lg md:mt-5 md:max-w-3xl md:text-xl">
          A unified, reliable, and privacy-centric data collection platform that
          you control.
        </p>
        <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center">
          <div
            className="inline-flex"
            data-elb="cta"
            data-elb-cta="position:hero;title:Capture user interactions directly through your markup"
          >
            <Button link="docs/walkerOS/getting-started">Get started</Button>
            <Button link="https://tagging.demo.elbwalker.com/" isSecondary>
              Live
              <br />
              Demo
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-10 text-center	">
        &nbsp;
        <span className="text-s mx-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 font-medium">
          <svg
            aria-hidden="true"
            className="h-4 w-4"
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
          Creates the full event context
        </span>
        <span className="text-s mx-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 font-medium">
          <svg
            aria-hidden="true"
            className="h-4 w-4"
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
          Handles the triggers
        </span>
        &nbsp;
        <span className="text-s mx-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 font-medium">
          <svg
            aria-hidden="true"
            className="h-4 w-4"
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
          Orders the race conditions
        </span>
      </div>
    </main>
  );
}
