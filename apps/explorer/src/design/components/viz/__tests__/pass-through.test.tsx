import React, { type ReactElement } from 'react';
import { ArticleTeaserTracking } from '../ArticleTeaserTracking';
import { DestinationMappingViz } from '../DestinationMappingViz';
import { HeroTaggingViz } from '../HeroTaggingViz';
import { TaggingViz } from '../TaggingViz';
import { heroScript, HERO_ARTICLES } from '../data/hero';
import { PROBE, expectRootTagged } from '../../__tests__/passThrough';

// walkeros.io tags the sections around the demos; a demo root takes tagging
// and accessibility attributes like every other component.
it.each<[string, ReactElement]>([
  ['HeroTaggingViz', <HeroTaggingViz {...PROBE} />],
  [
    'TaggingViz',
    <TaggingViz script={heroScript(HERO_ARTICLES[0])} t={0} {...PROBE} />,
  ],
  ['ArticleTeaserTracking', <ArticleTeaserTracking {...PROBE} />],
  ['DestinationMappingViz', <DestinationMappingViz {...PROBE} />],
])(
  '%s passes every attribute it does not own to its root',
  (_name, element) => {
    expectRootTagged(element, 'div');
  },
);
