import { Image, type ImageProps } from '../../atoms/Image';
import { Typography } from '../../atoms/Typography';

export interface CarouselItemProps {
  title: string;
  style?: number;
  type?: ImageProps['type'];
  alt?: string;
  onClick?: () => void;
  position?: number;
}

export const CarouselItem = ({
  title,
  style = 1,
  alt,
  onClick,
  type = 'thumbnail',
  position,
}: CarouselItemProps) => {
  return (
    <div
      data-elb="content"
      data-elbaction="visible;click"
      {...(position && { 'data-elb-content': `position:${position}` })}
      className="flex-shrink-0 w-64 cursor-pointer group px-2 py-2"
      onClick={onClick}
    >
      <div className="transition-transform duration-200 group-hover:scale-105">
        <Image
          type={type}
          style={style}
          alt={alt}
          title={title}
          className="mb-3"
        />
        <Typography
          data-elb-content={`title:${title}`}
          variant="body2"
          className="text-foreground group-hover:text-primary-600 transition-colors duration-200"
        >
          {title}
        </Typography>
      </div>
    </div>
  );
};
