import { AccountBox } from '../molecules/account';
import { ButtonPrimary } from '../molecules/buttons';

export function AccountLogIn() {
  return (
    <AccountBox>
      <form className="space-y-6">
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
          <ButtonPrimary label="Login"></ButtonPrimary>
        </div>
      </form>
    </AccountBox>
  );
}

export function AccountSignUp() {
  return (
    <AccountBox>
      <div className="mt-6">
        <form onSubmit={console.log} className="space-y-6">
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
            <ButtonPrimary label="Create your account"></ButtonPrimary>
          </div>
          <div className="text-xs leading-5 text-gray-500">
            <p>
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
        </form>
      </div>
    </AccountBox>
  );
}
