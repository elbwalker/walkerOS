import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { getEvents, Triggers } from '@walkeros/web-source-browser';

// walkeros.io tags its own pages for its walkerOS flow (prefix data-alst).
// These tests pin the attribute shapes and run walkerOS's own reader over the
// real components, so a tag walkerOS cannot read, or a card value that lands
// on the section's event, fails here. Run with tsx: the sources are TypeScript.
const WEBSITE = new URL('..', import.meta.url).pathname;
const ROOT = join(WEBSITE, '..');
const LANDING = join(WEBSITE, 'src/components/landing');
const { actionTags, cardTags, sectionTags } = await import(
  `${LANDING}/tags.ts`
);
const { FeatureItem, PlanCard, Section } = await import(
  `${ROOT}/apps/explorer/src/design/components/index.ts`
);

const h = React.createElement;
const PREFIX = 'data-alst';

function dom(element) {
  return new JSDOM(`<body>${renderToStaticMarkup(element)}</body>`).window
    .document;
}

test('a section root carries its entity and an impression, nothing else', () => {
  assert.deepEqual(sectionTags('plans'), {
    'data-alst': 'plans',
    'data-alstaction': 'impression:view',
  });
});

test('a card that carries a value is its own entity', () => {
  assert.deepEqual(cardTags('plan', 'plan', 'support'), {
    'data-alst': 'plan',
    'data-alst-plan': 'plan:support',
  });
});

test('a CTA carries only its click action', () => {
  assert.deepEqual(actionTags('select'), { 'data-alstaction': 'click:select' });
});

test('walkerOS reads a plan click as the plan event; the section impression names the section only', () => {
  const document = dom(
    h(
      Section,
      { ...sectionTags('plans'), id: 'plans' },
      ['community', 'support'].map((plan) =>
        h(
          PlanCard,
          {
            key: plan,
            ...cardTags('plan', 'plan', plan),
            label: plan,
            title: plan,
            cta: {
              label: 'Go',
              href: '/docs/',
              attributes: actionTags('select'),
            },
          },
          'Text',
        ),
      ),
    ),
  );
  const section = document.getElementById('plans');
  const impressions = getEvents(section, Triggers.Impression, PREFIX);
  assert.equal(impressions.length, 1);
  assert.equal(
    `${impressions[0].entity} ${impressions[0].action}`,
    'plans view',
  );
  assert.deepEqual(impressions[0].data, {});
  assert.deepEqual(
    impressions[0].nested.map((entity) => [entity.entity, entity.data]),
    [
      ['plan', { plan: 'community' }],
      ['plan', { plan: 'support' }],
    ],
  );
  const clicks = getEvents(
    section.querySelectorAll('a')[1],
    Triggers.Click,
    PREFIX,
  );
  assert.deepEqual(
    clicks.map((event) => [`${event.entity} ${event.action}`, event.data]),
    [['plan select', { plan: 'support' }]],
  );
});

test('walkerOS reads a feature docs click as the feature event', () => {
  const document = dom(
    h(
      Section,
      { ...sectionTags('features'), id: 'more-features' },
      h(
        FeatureItem,
        {
          ...cardTags('feature', 'topic', 'consent'),
          title: 'Consent handling',
          href: '/docs/guides/consent',
          linkAttributes: actionTags('docs'),
        },
        'Text',
      ),
    ),
  );
  const section = document.getElementById('more-features');
  assert.deepEqual(getEvents(section, Triggers.Impression, PREFIX)[0].data, {});
  const clicks = getEvents(section.querySelector('a'), Triggers.Click, PREFIX);
  assert.deepEqual(
    clicks.map((event) => [`${event.entity} ${event.action}`, event.data]),
    [['feature docs', { topic: 'consent' }]],
  );
});

// The old helper wrote data-alst-action and friends, which walkerOS never
// reads. Every tag now comes from the tagger, so no file writes one by hand.
test('no landing, theme or tracking file writes a data-alst attribute by hand', () => {
  const files = [
    ...readdirSync(LANDING).map((file) => join(LANDING, file)),
    ...readdirSync(join(WEBSITE, 'src/theme'), { recursive: true })
      .filter((file) => /\.(js|tsx?)$/.test(file))
      .map((file) => join(WEBSITE, 'src/theme', file)),
    join(WEBSITE, 'src/components/walkerjs.tsx'),
    join(WEBSITE, 'src/pages/index.tsx'),
  ];
  for (const file of files)
    assert.doesNotMatch(
      readFileSync(file, 'utf8'),
      /data-alst/,
      `${file} writes a tag by hand`,
    );
});

const SECTION_ENTITY = {
  Hero: 'hero',
  Why: 'why',
  Tagging: 'tagging',
  Vendor: 'vendor',
  Proof: 'proof',
  MoreFeatures: 'features',
  Beyond: 'beyond',
  Plans: 'plans',
  Faq: 'faq',
};

const landing = (file) => readFileSync(join(LANDING, file), 'utf8');
const flat = (text) => text.replace(/\s+/g, ' ');

test('every landing section tags its root with its own entity', () => {
  for (const [file, entity] of Object.entries(SECTION_ENTITY))
    assert.match(
      landing(`${file}.tsx`),
      new RegExp(`\\{\\.\\.\\.sectionTags\\('${entity}'\\)\\}`),
      `${file}.tsx does not tag its root as ${entity}`,
    );
});

test('the landing only places copy: no CSS, className or style', () => {
  const files = readdirSync(LANDING);
  assert.deepEqual(
    files.filter((file) => !/\.tsx?$/.test(file)),
    [],
  );
  for (const file of files)
    assert.doesNotMatch(
      landing(file),
      /className|style=|\.s?css['"]/,
      `${file} styles the landing`,
    );
});

test('the home page renders the nine sections in the artifact order', () => {
  const page = readFileSync(join(WEBSITE, 'src/pages/index.tsx'), 'utf8');
  assert.deepEqual(
    [...page.matchAll(/<(\w+)Section \/>/g)].map((match) => match[1]),
    Object.keys(SECTION_ENTITY),
  );
});

// The founder's rule for Ayla's copy: only technically false statements are
// corrected (and reported to her). These two were false.
test('the page ships the two corrected sentences, not the false originals', () => {
  assert.match(
    flat(landing('Vendor.tsx')),
    /A destination config translates it for GA4, Meta, TikTok, Amplitude or 30\+ others\./,
  );
  assert.match(
    flat(landing('MoreFeatures.tsx')),
    /Set the consent each destination needs\. Until a visitor grants it, that destination's events wait in a queue and nothing is sent to it\./,
  );
  assert.doesNotMatch(
    landing('Vendor.tsx') + landing('MoreFeatures.tsx'),
    /50\+ others|CMP choice resolves|carry their own consent requirement/,
  );
});
