import React from 'react';

export default function Testimonial() {
  return (
    <section className="overflow-hidden relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <svg
          className="absolute top-full right-full translate-x-1/3 -translate-y-1/4 transform lg:translate-x-1/2 xl:-translate-y-1/2"
          width={404}
          height={404}
          fill="none"
          viewBox="0 0 404 404"
          role="img"
          aria-labelledby="svg-workcation"
        >
          <title id="svg-workcation">Workcation</title>
          <defs>
            <pattern
              id="ad119f34-7694-4c31-947f-5c9d249b21f3"
              x={0}
              y={0}
              width={20}
              height={20}
              patternUnits="userSpaceOnUse"
            >
              <rect
                x={0}
                y={0}
                width={4}
                height={4}
                className="text-gray-600"
                fill="currentColor"
              />
            </pattern>
          </defs>
          <rect
            width={404}
            height={404}
            fill="url(#ad119f34-7694-4c31-947f-5c9d249b21f3)"
          />
        </svg>

        <div className="relative mt-10">
          <div className="mx-auto max-w-3xl text-center text-2xl font-medium leading-9">
            &rdquo;I used walker.js in multiple projects to create a first-party
            data foundation for marketing analytics. I like the overall
            simplicity and flexibility of the library.&rdquo;
          </div>
          <footer className="mt-8">
            <div className="md:flex md:items-center md:justify-center">
              <div className="md:flex-shrink-0">
                <img
                  alt=""
                  src={require('@site/static/img/timo.png').default}
                  className="mx-auto h-20 w-20 rounded-full "
                  placeholder="none"
                />
              </div>
              <div className="mt-3 text-center md:mt-0 md:ml-4 md:flex md:items-center">
                <div className="text-base font-medium">Timo Dechau</div>

                <svg
                  className="mx-1 hidden h-5 w-5 text-elbwalker-600 md:block"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M11 0h3L9 20H6l5-20z" />
                </svg>

                <div className="text-base font-medium">
                  Founder & Data Engineer, Deepskydata
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}
