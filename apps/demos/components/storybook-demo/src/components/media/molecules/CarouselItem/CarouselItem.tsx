import { Image } from '../../atoms/Image';
import { Typography } from '../../atoms/Typography';

export interface CarouselItemProps {
  title: string;
  src?: string;
  alt?: string;
  onClick?: () => void;
}

export const CarouselItem = ({ title, src, alt, onClick }: CarouselItemProps) => {
  return (
    <div 
      className="flex-shrink-0 w-64 cursor-pointer group"
      onClick={onClick}
    >
      <div className="transition-transform duration-200 group-hover:scale-105">
        <Image
          type="thumbnail"
          src={src}
          alt={alt || title}
          title={title}
          className="mb-3"
        />
        <Typography variant="body2" className="text-foreground group-hover:text-primary-600 transition-colors duration-200">
          {title}
        </Typography>
      </div>
    </div>
  );
};