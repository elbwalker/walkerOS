import { AccountLogIn } from '../organisms/account';

export default function LogIn() {
  return (
    <div className="min-h-full pt-16 pb-12 flex flex-col bg-gray-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-4 text-3xl tracking-tight text-center font-extrabold text-white sm:mt-5 sm:leading-none lg:mt-6">
          Welcome back
        </h1>
        <p className="mt-2 text-base text-center text-gray-300">
          Please log in
        </p>
      </div>
      <div className="mt-6 flex-shrink-0 flex justify-center">
        <AccountLogIn />
      </div>
    </div>
  );
}
