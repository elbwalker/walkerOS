import React from 'react';
import { ButtonPrimary } from '../atoms/button';

export default function SignUp() {
  return (
    <div className="bg-white sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden">
      <div className="px-4 py-8 sm:px-10">
        <div className="mt-6">
          <form elb="app" onSubmit={console.log} className="space-y-6">
            <div>
              <label htmlFor="name" className="sr-only">
                Full name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                autoComplete="name"
                placeholder="Full name"
                required
                className="block w-full shadow-sm focus:ring-elbwalker-500 focus:border-elbwalker-500 sm:text-sm border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="mobile-or-email" className="sr-only">
                Mobile number or email
              </label>
              <input
                type="text"
                name="mobile-or-email"
                id="mobile-or-email"
                autoComplete="email"
                placeholder="Mobile number or email"
                required
                className="block w-full shadow-sm focus:ring-elbwalker-500 focus:border-elbwalker-500 sm:text-sm border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                required
                className="block w-full shadow-sm focus:ring-elbwalker-500 focus:border-elbwalker-500 sm:text-sm border-gray-300 rounded-md"
              />
            </div>

            <div>
              <ButtonPrimary
                label="Create your account"
                action={'create'}
              ></ButtonPrimary>
            </div>
          </form>
        </div>
      </div>
      <div className="px-4 py-6 bg-gray-50 border-t-2 border-gray-200 sm:px-10">
        <p className="text-xs leading-5 text-gray-500">
          By signing up, you agree to our{' '}
          <span className="font-medium text-gray-900 hover:underline">
            Terms
          </span>
          ,{' '}
          <span className="font-medium text-gray-900 hover:underline">
            Data Policy
          </span>{' '}
          and{' '}
          <span className="font-medium text-gray-900 hover:underline">
            Cookies Policy
          </span>
          .
        </p>
      </div>
    </div>
  );
}
