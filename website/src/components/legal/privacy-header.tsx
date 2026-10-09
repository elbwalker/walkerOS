import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

export default function LegalPrivacyHeader({ changeLanguage }) {
  return (
    <div className="">
      <div className="mx-auto max-w-7xl py-16 px-4 sm:py-24 sm:px-6 lg:flex lg:justify-around lg:px-8">
        <div className="max-w-xl">
          <h2 className="text-heading-md font-extrabold text-fg sm:text-heading-xl sm:tracking-tight lg:text-display">
            Privacy Policy
          </h2>
        </div>
        <div className="mt-10 w-full max-w-xs">
          <label
            htmlFor="currency"
            className="block text-body font-medium text-fg-2"
          >
            Language
          </label>
          <div className="relative mt-1.5">
            <select
              id="currency"
              name="currency"
              className="block w-full appearance-none rounded-sm border border-border-strong bg-bg bg-none py-2 pl-3 pr-10 text-body text-fg focus:border-focus focus:outline-hidden focus:ring-1 focus:ring-focus sm:text-product-body"
              defaultValue="EN"
              onChange={(event) => changeLanguage(event.target.value)}
            >
              <option value="EN">English</option>
              <option value="DE">German</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
              <ChevronDownIcon
                className="h-4 w-4 text-fg-2"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
