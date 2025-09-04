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

  return (
    <div {...trackingProps} className="min-h-screen bg-background">
      <HeaderBar
        activeMenuItem={activeMenuItem}
        onMenuItemClick={onMenuItemClick}
      />

      <main>
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
          backgroundGradient="from-primary-600 to-primary-800"
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
      </main>
    </div>
  );
};
