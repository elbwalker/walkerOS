import { ReactNode } from 'react';
import Data from '../../data';

interface Props {
  children?: ReactNode;
}

export function AccountBox({ children }: Props) {
  return (
    <div data-elb={Data.Entities.Account} className="bg-white sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden">
      <div className="px-4 py-8 sm:px-10">{children}</div>
    </div>
  );
}
