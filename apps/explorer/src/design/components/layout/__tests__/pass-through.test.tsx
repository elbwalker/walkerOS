import React, { type ReactElement } from 'react';
import { CardGrid } from '../CardGrid';
import { Cluster } from '../Cluster';
import { Section } from '../Section';
import { Split } from '../Split';
import { PROBE, expectRootTagged } from '../../__tests__/passThrough';

it.each<[string, ReactElement, string]>([
  ['Section', <Section {...PROBE}>Body</Section>, 'section'],
  [
    'CardGrid',
    <CardGrid min={280} {...PROBE}>
      Body
    </CardGrid>,
    'div',
  ],
  ['Split', <Split start="A" end="B" {...PROBE} />, 'div'],
  ['Cluster', <Cluster {...PROBE}>Body</Cluster>, 'div'],
])(
  '%s passes every attribute it does not own to its root',
  (_name, element, tagName) => {
    expectRootTagged(element, tagName);
  },
);
