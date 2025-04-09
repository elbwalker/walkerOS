import React, { ReactNode } from 'react';

interface CheckProps {
  children: ReactNode;
}

export function Check({ children }: CheckProps) {
  return (
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
} 