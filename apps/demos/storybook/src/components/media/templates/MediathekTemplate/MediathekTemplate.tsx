import { useState } from 'react';
import { HeaderBar } from '../../organisms/HeaderBar';
import { HeroBanner } from '../../organisms/HeroBanner';
import { CarouselSection } from '../../organisms/CarouselSection';
import { PromotionBanner } from '../../organisms/PromotionBanner';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';
import { assign } from '@walkeros/core';

export interface MediathekTemplateProps {
  activeMenuItem?: string;
  onMenuItemClick?: (item: string) => void;
  dataElb?: DataElb;
}

const topSeriesItems = [
  {
    title: 'Debugging Dreams',
  },
  {
    title: 'Return of the Bug',
  },
  {
    title: 'Code Wars',
  },
  {
    title: 'Data Diaries',
  },
  {
    title: 'Sleepless in Stack Overflow',
  },
];

const filmRecommendations = [
  {
    title: 'Inside Server-Side Valley',
  },
  {
    title: 'A Beautiful Code',
  },
  {
    title: 'The Art of Refactoring',
  },
  {
    title: 'The Pragmatic Programmer',
  },
  {
    title: 'A Journey into Agile',
  },
];

// Rows appended at runtime by the "Add row" button. Cycled so repeated clicks
// keep producing fresh, tagged content.
const extraRowCatalog = [
  {
    title: 'Trending Now',
    items: [
      { title: 'The Nightly Build' },
      { title: 'Merge Conflict' },
      { title: 'Ship It' },
      { title: 'Rubber Duck Tales' },
    ],
  },
  {
    title: 'New Releases',
    items: [
      { title: 'Null and Void' },
      { title: 'The Big O' },
      { title: 'Race Condition' },
      { title: 'Off By One' },
    ],
  },
  {
    title: 'Because You Watched',
    items: [
      { title: 'Kernel Panic' },
      { title: 'The Legacy System' },
      { title: 'Hotfix Heroes' },
      { title: 'Semver Saga' },
    ],
  },
];

export const MediathekTemplate = ({
  activeMenuItem,
  onMenuItemClick,
  dataElb,
}: MediathekTemplateProps) => {
  const trackingProps = createTrackingProps(
    assign(
      {
        context: { stage: 'inspo' },
      },
      dataElb,
    ),
    'MediathekTemplate',
  );

  const [extraRows, setExtraRows] = useState(0);

  return (
    <div {...trackingProps} className="min-h-screen bg-bg text-fg">
      <HeaderBar
        activeMenuItem={activeMenuItem}
        onMenuItemClick={onMenuItemClick}
      />

      {/* data-elbobserve: the walker auto-registers rows added below at runtime,
          so a new row's tagged items fire their events without a walker re-run. */}
      <main data-elbobserve="">
        <HeroBanner
          title="Life in Code"
          subtitle="Balancing Passion and Work"
          buttonText="Explore Now"
          style={5}
        />

        <CarouselSection title="Our Top Series" items={topSeriesItems} />

        <CarouselSection
          title="Movie Recommendations"
          items={filmRecommendations}
          type="postcard"
        />

        <PromotionBanner
          headline="Activate Kids Mode"
          subtitle="Create a safe space for younger viewers."
          buttonText="Activate Now"
          backgroundGradient="from-surface-2 to-surface"
        />

        <CarouselSection
          title="Exciting Documentaries and Reports"
          items={[
            {
              title: 'The Future of Tech',
            },
            {
              title: 'AI Revolution',
            },
            {
              title: 'Open Source Stories',
            },
            {
              title: 'Digital Transformation',
            },
          ]}
        />

        {Array.from({ length: extraRows }).map((_, index) => {
          const row = extraRowCatalog[index % extraRowCatalog.length];
          return (
            <CarouselSection
              key={`extra-${index}`}
              title={`${row.title} #${index + 1}`}
              items={row.items}
            />
          );
        })}

        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            type="button"
            onClick={() => setExtraRows((count) => count + 1)}
            className="rounded-md border border-border-strong bg-surface px-4 py-2 text-ui text-fg transition-colors hover:bg-surface-2"
          >
            Add row
          </button>
        </div>
      </main>
    </div>
  );
};
