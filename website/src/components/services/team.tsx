import React from 'react';
import { Button } from '../atoms/buttons';

const people = [
  {
    name: 'Alexander Kirtzel',
    role: 'Co-Founder / Developer',
    imageUrl: '/img/author/alexander2.png',
    bio: 'Alexander is the creator and head developer of walkerOS. He specializes in the technical setup of tracking and data collection and will help you get walkerOS running.',
    linkedinUrl: 'https://www.linkedin.com/in/alexanderkirtzel/',
  },
  {
    name: 'Ayla Prinz',
    role: 'Co-Founder /  Analyst',
    imageUrl: '/img/author/ayla2.png',
    bio: 'Ayla brings her expertise as an analytics consultant to create structured measurement plans and deliver the first insightful reports based on your walkerOS data.',
    linkedinUrl: 'https://www.linkedin.com/in/ayla-prinz/',
  },
  // More people...
];

export default function Team() {
  return (
    <div className="py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-20 px-6 lg:px-8 xl:grid-cols-5">
        <div className="max-w-2xl xl:col-span-2">
          <h2 className="text-pretty text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            About the team
          </h2>
          <p className="mt-6 text-lg/8 text-white">
            We're a fast data duo dedicated to privacy-friendly data collection
            and actionable marketing and product data.
          </p>
        </div>
        <ul
          role="list"
          className="-mt-12 space-y-12 divide-y divide-gray-50 xl:col-span-3"
        >
          {people.map((person) => (
            <li
              key={person.name}
              className="flex flex-col gap-10 pt-12 sm:flex-row"
            >
              <img
                alt=""
                src={person.imageUrl}
                className="aspect-[4/5] w-52 flex-none rounded-2xl object-cover"
              />
              <div className="max-w-xl flex-auto">
                <h3 className="text-lg/8 font-semibold tracking-tight text-gray-50">
                  {person.name}
                </h3>
                <p className="text-base/7 text-elbwalker-600">{person.role}</p>
                <p className="mt-6 text-base/7 text-gray-50">{person.bio}</p>
                <ul role="list" className="mt-6 flex gap-x-6">
                  <li>
                    <a
                      href={person.linkedinUrl}
                      className="text-gray-50 hover:text-gray-200"
                    >
                      <span className="sr-only">LinkedIn</span>
                      <svg
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        className="size-5"
                      >
                        <path
                          d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z"
                          clipRule="evenodd"
                          fillRule="evenodd"
                        />
                      </svg>
                    </a>
                  </li>
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
