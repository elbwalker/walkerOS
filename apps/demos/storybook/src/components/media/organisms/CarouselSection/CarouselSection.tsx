import type { ImageProps } from '../../atoms/Image';
import { Typography } from '../../atoms/Typography';
import { CarouselItem } from '../../molecules/CarouselItem';

export interface CarouselSectionProps {
  title: string;
  items: Array<{
    title: string;
    alt?: string;
  }>;
  onItemClick?: (id: unknown) => void;
  type?: ImageProps['type'];
}

export const CarouselSection = ({
  title,
  items,
  onItemClick,
  type = 'thumbnail',
}: CarouselSectionProps) => {
  return (
    <section
      data-elbcontext={`list:${title}`}
      className="py-6 overflow-visible"
    >
      <div className="max-w-7xl mx-auto px-6 overflow-visible">
        <Typography variant="h3" className="mb-8 text-foreground">
          {title}
        </Typography>

        <div className="flex space-x-1 overflow-x-auto scrollbar-hide pb-4 -mx-2 -my-2">
          {items.map((item, index) => (
            <CarouselItem
              key={index}
              title={item.title}
              position={++index}
              style={index}
              type={type}
              alt={item.alt}
              onClick={() => onItemClick?.(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
