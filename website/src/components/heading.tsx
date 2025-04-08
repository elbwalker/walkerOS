import React from 'react';

type HeadingProps = {
  title: string;
  description?: string;
};

export default function Heading({
  title,
  description,
}: HeadingProps): React.JSX.Element {
  return (
    <div className="lg:text-center">
      {description && (
        <p className="text-base font-semibold uppercase tracking-wide text-elbwalker">
          {description}
        </p>
      )}
      <h2 className="mt-2 text-3xl font-extrabold leading-8 tracking-tight text-gray-50 sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}
