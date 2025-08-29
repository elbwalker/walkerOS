import { Image, type ImageProps } from '../../atoms/Image';
import { Typography } from '../../atoms/Typography';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';
import { assign } from '@walkeros/core';

export interface CarouselItemProps {
  title: string;
  style?: number;
  type?: ImageProps['type'];
  alt?: string;
  onClick?: () => void;
  position?: number;
  dataElb?: DataElb;
}

export const CarouselItem = ({
  title,
  style = 1,
  alt,
  onClick,
  type = 'thumbnail',
  position,
  dataElb,
}: CarouselItemProps) => {
  const trackingProps = createTrackingProps(
    assign(
      {
        entity: 'content',
        action: 'visible',
        data: {
          title: title,
          ...(position && { position: position }),
        },
      },
      dataElb,
    ),
  );

  return (
    <div
      {...trackingProps}
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
          variant="body2"
          className="text-foreground group-hover:text-primary-600 transition-colors duration-200"
        >
          {title}
        </Typography>
      </div>
    </div>
  );
};
