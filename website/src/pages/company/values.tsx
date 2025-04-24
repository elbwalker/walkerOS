import React from 'react';
import {
  AcademicCapIcon,
  SwatchIcon,
  FaceSmileIcon,
  HeartIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import Heading from '../heading';

export default function CompanyValues() {
  return (
    <div className="bg-gray-900 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Heading title="Our values" description="How we work" />

        <div className="mt-10">
          <dl className="space-y-10 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10 md:space-y-0">
            <div className="relative">
              <dt>
                <div className="absolute flex h-12 w-12 items-center justify-center rounded-md bg-elbwalker-500 text-white">
                  <LightBulbIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="ml-16 text-lg font-medium leading-6 text-gray-50">
                  We focus on simplicity
                </p>
              </dt>
              <dd className="mt-2 ml-16 text-base text-gray-400">
                <p>
                  Pareto principle: Not everything has to be perfect. We prefer
                  to reach our goals step by step and optimize iteratively. That
                  is why we sometimes knock over initial ideas. The 80/20 rule
                  guides us. For us, effectiveness comes before efficiency.
                </p>
                <br />
                <p>
                  Transparency &amp; Speed: We want to focus on the essentials
                  in our work. That is why we make decisions quickly and
                  transparently. We mainly use data for this purpose. Because we
                  love the added value of data and data-driven decisions - not
                  only for our customers.
                </p>
              </dd>
            </div>

            <div className="relative">
              <dt>
                <div className="absolute flex h-12 w-12 items-center justify-center rounded-md bg-elbwalker-500 text-white">
                  <SwatchIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="ml-16 text-lg font-medium leading-6 text-gray-50">
                  We take initiative
                </p>
              </dt>
              <dd className="mt-2 ml-16 text-base text-gray-400">
                <p>
                  Proactivity: For us, participation and freedom apply at all
                  levels. We structure our tasks ourselves and do not wait for
                  work packages. We believe: those who work independently are
                  more commited to their goals.
                </p>
                <br />
                <p>
                  Participation: We believe that our culture is continually
                  changing. Every team member helps to shape our culture. At
                  elbwalker, we share the values presented here, but we also
                  bring our own experiences and point of views. That is why we
                  speak of culture add-on rather than culture fit when it comes
                  to new team members.
                </p>
              </dd>
            </div>

            <div className="relative">
              <dt>
                <div className="absolute flex h-12 w-12 items-center justify-center rounded-md bg-elbwalker-500 text-white">
                  <HeartIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="ml-16 text-lg font-medium leading-6 text-gray-50">
                  We act like owners
                </p>
              </dt>
              <dd className="mt-2 ml-16 text-base text-gray-400">
                <p>
                  Customer focus: Our customers and their feedback are the most
                  important drivers of our work. We are passionate about solving
                  their problems. Those who work with us make our customers
                  happiness a priority.
                </p>
                <br />
                <p>
                  Entrepreneurial spirit: The role and energy of each individual
                  is important for the success of elbwalker. We know our
                  strength, weaknesses, opportunities and challenges and those
                  of our industry and we use our spirit to tackle or further
                  develop them.
                </p>
              </dd>
            </div>

            <div className="relative">
              <dt>
                <div className="absolute flex h-12 w-12 items-center justify-center rounded-md bg-elbwalker-500 text-white">
                  <FaceSmileIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="ml-16 text-lg font-medium leading-6 text-gray-50">
                  We adapt to change
                </p>
              </dt>
              <dd className="mt-2 ml-16 text-base text-gray-400">
                <p>
                  Pivoting: We keep a close eye on our industry and know that
                  our market is changing quickly. That is why we keep the
                  flexibility for constant changes. elbwalker will continue to
                  grow and in a year no longer be the company it is now. And we
                  think that is awesome.
                </p>
                <br />
                <p>
                  Traveling: Working in a startup is like going on a somewhat
                  uncertain but adventurous journey. We keep adapting to new
                  situations and people. To this journey we all bring
                  perseverance, courcage and a good sense of humor. We laugh a
                  lot ... seriously a lot.
                </p>
              </dd>
            </div>

            <div className="relative">
              <dt>
                <div className="absolute flex h-12 w-12 items-center justify-center rounded-md bg-elbwalker-500 text-white">
                  <AcademicCapIcon className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="ml-16 text-lg font-medium leading-6 text-gray-50">
                  We strive for growth
                </p>
              </dt>
              <dd className="mt-2 ml-16 text-base text-gray-400">
                <p>
                  Feedback: We aim to continuously improve our product, company,
                  team and ourselves as individuals. We value constant
                  reflection as well as giving and receiving feedback. This is
                  how we can live an honest and open exchange at elbwalker.
                </p>
                <br />
                <p>
                  Learning: We know what we are good at and what we are not yet.
                  We want to learn new things all the time. We can only get
                  better by trying things out and make mistakes. Our company is
                  complemented by our different strenghts and we can all learn
                  from each other. We trust and rely on the competence and
                  supportiveness of the other.
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
