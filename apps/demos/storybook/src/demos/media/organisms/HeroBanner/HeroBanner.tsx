import { Image } from '../../../../shared/atoms/Image';
import { BannerText } from '../../molecules/BannerText';
import { TaggedButton } from '../../molecules/TaggedButton';
import { createTrackingProps, type DataElb } from '../../../../shared/tagger';
import { assign } from '@walkeros/core';

export interface HeroBannerProps {
  title: string;
  subtitle: string;
  buttonText: string;
  style?: number;
  onButtonClick?: () => void;
  dataElb?: DataElb;
}

export const HeroBanner = ({
  title,
  subtitle,
  buttonText,
  style = 1,
  onButtonClick,
  dataElb,
}: HeroBannerProps) => {
  const trackingProps = createTrackingProps(
    assign(
      {
        entity: 'teaser',
        trigger: 'visible',
        action: 'visible',
        data: { type: 'hero' },
      },
      dataElb,
    ),
    'HeroBanner',
  );

  return (
    <div
      {...trackingProps}
      className="relative h-96 md:h-[500px] overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image type="banner" style={style} className="w-full h-full" />
      </div>

      {/* Overlay: the page ground fades into the image, so the text reads in both themes */}
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/20" />

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-6 flex items-center">
        <div className="max-w-2xl space-y-6">
          <BannerText headline={title} subtitle={subtitle} />
          <TaggedButton
            label={buttonText}
            primary={true}
            onClick={onButtonClick}
            dataElb={{
              action: 'click:explore',
              data: { type: 'primary' },
            }}
          />
        </div>
      </div>
    </div>
  );
};
