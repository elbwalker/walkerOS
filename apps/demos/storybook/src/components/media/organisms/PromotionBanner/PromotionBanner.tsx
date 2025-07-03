import { BannerText } from '../../molecules/BannerText';
import { ActionButton } from '../../molecules/ActionButton';

export interface PromotionBannerProps {
  headline: string;
  subtitle: string;
  buttonText: string;
  backgroundGradient?: string;
  onButtonClick?: () => void;
}

export const PromotionBanner = ({
  headline,
  subtitle,
  buttonText,
  backgroundGradient = 'from-primary-700 to-primary-900',
  onButtonClick,
}: PromotionBannerProps) => {
  return (
    <div className={`bg-gradient-to-r ${backgroundGradient} rounded-xl p-8 md:p-12 mx-6 my-8`}>
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
        <div className="text-center md:text-left">
          <BannerText headline={headline} subtitle={subtitle} />
        </div>
        
        <div className="flex-shrink-0">
          <ActionButton
            text={buttonText}
            action="activate"
            onClick={onButtonClick}
          />
        </div>
      </div>
    </div>
  );
};