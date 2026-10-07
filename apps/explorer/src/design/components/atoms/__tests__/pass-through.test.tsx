import React, { type ReactElement } from 'react';
import { Card } from '../Card';
import { EventLegend } from '../EventLegend';
import { Eyebrow } from '../Eyebrow';
import { Icon } from '../Icon';
import { InlineCode } from '../InlineCode';
import { Stat } from '../Stat';
import { Text } from '../Text';
import { TextLink } from '../TextLink';
import {
  PROBE,
  RouterLink,
  expectRootTagged,
  expectRoutedLink,
} from '../../__tests__/passThrough';

// walkeros.io tags sections and CTAs through these attributes; a dropped one
// silently stops tracking.
it.each<[string, ReactElement, string]>([
  ['Icon', <Icon name="check" {...PROBE} />, 'svg'],
  ['Eyebrow', <Eyebrow {...PROBE}>Label</Eyebrow>, 'p'],
  [
    'Stat',
    <Stat value="1" {...PROBE}>
      Label
    </Stat>,
    'div',
  ],
  ['Card', <Card {...PROBE}>Body</Card>, 'div'],
  ['Text', <Text {...PROBE}>Copy</Text>, 'p'],
  [
    'TextLink',
    <TextLink href="/docs" {...PROBE}>
      Docs
    </TextLink>,
    'a',
  ],
  ['InlineCode', <InlineCode {...PROBE}>elb()</InlineCode>, 'code'],
  ['EventLegend', <EventLegend {...PROBE} />, 'div'],
])(
  '%s passes every attribute it does not own to its root',
  (_name, element, tagName) => {
    expectRootTagged(element, tagName);
  },
);

it('TextLink renders through the link component with its href and attributes', () => {
  expectRoutedLink(
    <TextLink href="/docs" linkComponent={RouterLink} {...PROBE}>
      Docs
    </TextLink>,
    '/docs',
  );
});
