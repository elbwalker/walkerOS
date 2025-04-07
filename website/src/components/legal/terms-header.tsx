import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

export default function LegalTermsHeader({ changeLanguage }) {
  return (
    <div className="">
      <div className="mx-auto max-w-7xl py-16 px-4 sm:py-24 sm:px-6 lg:flex lg:justify-around lg:px-8">
        <div className="max-w-xl">
          <h2 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
            Terms of Services
          </h2>
        </div>
        <div className="mt-10 w-full max-w-xs">
          <label
            htmlFor="currency"
            className="block text-base font-medium text-gray-300"
          >
            Language
          </label>
          <div className="relative mt-1.5">
            <select
              id="currency"
              name="currency"
              className="block w-full appearance-none rounded-md border border-transparent bg-gray-700 bg-none py-2 pl-3 pr-10 text-base text-white focus:border-white focus:outline-hidden focus:ring-1 focus:ring-white sm:text-sm"
              defaultValue="EN"
              onChange={(event) => changeLanguage(event.target.value)}
            >
              <option value="EN">English</option>
              <option value="DE">German</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
              <ChevronDownIcon
                className="h-4 w-4 text-white"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
