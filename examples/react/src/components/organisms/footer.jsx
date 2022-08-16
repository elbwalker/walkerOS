import React from 'react';

export default function Footer() {
  return (
    <footer
      className="bg-gray-50"
      data-elb="page"
      data-elbaction="visible:read"
    >
      <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
        <p className="mt-8 text-center text-base text-gray-400">
          walker.js demo for react.
          <br />
          Components made by <a href="https://tailwindui.com/">Tailwind UI</a>.
        </p>
      </div>
    </footer>
  );
}
