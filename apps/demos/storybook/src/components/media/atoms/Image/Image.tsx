import { PhotoPlaceholder } from '@walkeros/explorer/design/components';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';
import { assign } from '@walkeros/core';

export interface ImageProps {
  type: 'thumbnail' | 'banner' | 'postcard';
  style?: number;
  alt?: string;
  title?: string;
  className?: string;
  dataElb?: DataElb;
}

const typeClasses = {
  thumbnail: 'aspect-video rounded-lg',
  banner: 'aspect-[16/6] rounded-xl',
  postcard: 'aspect-[16/20] rounded-xl',
};

export const Image = ({
  type,
  style = 1,
  alt,
  title,
  className = '',
  dataElb,
}: ImageProps) => {
  const trackingProps = createTrackingProps(
    assign(
      {
        data: {
          img: `id-${style}`,
          type: type,
          ...(title && { title }),
          ...(alt && { alt }),
        },
      },
      dataElb,
    ),
    'Image',
  );
  const label = alt || title;

  // Offline: a striped placeholder stands in for the photo.
  return (
    <div
      {...trackingProps}
      {...(label ? { role: 'img', 'aria-label': label } : {})}
      className={`${typeClasses[type]} flex overflow-hidden ${className}`}
    >
      <PhotoPlaceholder className="flex-1" />
    </div>
  );
};
