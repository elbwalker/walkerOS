import { HeaderBar } from '../../organisms/HeaderBar';
import { HeroBanner } from '../../organisms/HeroBanner';
import { CarouselSection } from '../../organisms/CarouselSection';
import { PromotionBanner } from '../../organisms/PromotionBanner';

export interface MediathekTemplateProps {
  activeMenuItem?: string;
  onMenuItemClick?: (item: string) => void;
}

const topSeriesItems = [
  {
    id: '1',
    title: 'Debugging Dreams',
    src: 'https://picsum.photos/400/225?random=1',
  },
  {
    id: '2',
    title: 'Code Wars',
    src: 'https://picsum.photos/400/225?random=2',
  },
  {
    id: '3',
    title: 'API Chronicles',
    src: 'https://picsum.photos/400/225?random=3',
  },
  {
    id: '4',
    title: 'Return of the Bug',
  },
  {
    id: '5',
    title: 'Sleepless in Stack Overflow',
    src: 'https://picsum.photos/400/225?random=5',
  },
];

const filmRecommendations = [
  {
    id: '6',
    title: 'The Art of Refactoring',
    src: 'https://picsum.photos/400/225?random=6',
  },
  {
    id: '7',
    title: 'Inside Silicon Valley',
    src: 'https://picsum.photos/400/225?random=7',
  },
  {
    id: '8',
    title: 'A Journey into Agile',
    src: 'https://picsum.photos/400/225?random=8',
  },
  {
    id: '9',
    title: 'Beautiful Code',
  },
  {
    id: '10',
    title: 'The Pragmatic Programmer',
    src: 'https://picsum.photos/400/225?random=10',
  },
];

export const MediathekTemplate = ({
  activeMenuItem,
  onMenuItemClick,
}: MediathekTemplateProps) => {
  return (
    <div className="min-h-screen bg-background">
      <HeaderBar
        activeMenuItem={activeMenuItem}
        onMenuItemClick={onMenuItemClick}
      />
      
      <main>
        <HeroBanner
          title="Life in Code"
          subtitle="Balancing Passion and Work"
          buttonText="Explore Now"
          backgroundSrc="https://picsum.photos/1200/500?random=hero"
        />
        
        <CarouselSection
          title="Our Top Series"
          items={topSeriesItems}
        />
        
        <CarouselSection
          title="Movie Recommendations"
          items={filmRecommendations}
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
              id: '11',
              title: 'The Future of Tech',
              src: 'https://picsum.photos/400/225?random=11',
            },
            {
              id: '12',
              title: 'AI Revolution',
              src: 'https://picsum.photos/400/225?random=12',
            },
            {
              id: '13',
              title: 'Open Source Stories',
            },
            {
              id: '14',
              title: 'Digital Transformation',
              src: 'https://picsum.photos/400/225?random=14',
            },
          ]}
        />
      </main>
    </div>
  );
};