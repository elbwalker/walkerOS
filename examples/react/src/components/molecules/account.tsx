import { ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

export function AccountBox({ children }: Props) {
  return (
    <div className="bg-white sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden">
      <div className="px-4 py-8 sm:px-10">{children}</div>
    </div>
  );
}
