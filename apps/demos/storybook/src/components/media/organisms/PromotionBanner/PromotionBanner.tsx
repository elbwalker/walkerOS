import { BannerText } from '../../molecules/BannerText';
import { TaggedButton } from '../../molecules/TaggedButton';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';
import { assign } from '@walkeros/core';

export interface PromotionBannerProps {
  headline: string;
  subtitle: string;
  buttonText: string;
  backgroundGradient?: string;
  onButtonClick?: () => void;
  dataElb?: DataElb;
}

export const PromotionBanner = ({
  headline,
  subtitle,
  buttonText,
  backgroundGradient = 'from-primary-700 to-primary-900',
  onButtonClick,
  dataElb,
}: PromotionBannerProps) => {
  const trackingProps = createTrackingProps(
    assign(
      {
        trigger: 'visible',
        data: { type: 'promo' },
      },
      dataElb,
    ),
    'PromotionBanner',
  );

  return (
    <div
      {...trackingProps}
      className={`bg-gradient-to-r ${backgroundGradient} rounded-xl p-8 md:p-12 mx-6 my-8`}
    >
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
        <div className="text-center md:text-left">
          <BannerText headline={headline} subtitle={subtitle} />
        </div>

        <div className="flex-shrink-0">
          <TaggedButton
            label={buttonText}
            primary={true}
            onClick={onButtonClick}
            dataElb={{
              action: 'engage',
              data: { type: 'button' },
            }}
          />
        </div>
      </div>
    </div>
  );
};
