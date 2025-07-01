import { Typography } from '../../atoms/Typography';
import { CarouselItem } from '../../molecules/CarouselItem';

export interface CarouselSectionProps {
  title: string;
  items: Array<{
    id: string;
    title: string;
    src?: string;
    alt?: string;
  }>;
  onItemClick?: (id: string) => void;
}

export const CarouselSection = ({ title, items, onItemClick }: CarouselSectionProps) => {
  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-6">
        <Typography variant="h3" className="mb-6 text-foreground">
          {title}
        </Typography>
        
        <div className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4">
          {items.map((item) => (
            <CarouselItem
              key={item.id}
              title={item.title}
              src={item.src}
              alt={item.alt}
              onClick={() => onItemClick?.(item.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};