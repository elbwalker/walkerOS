import { Image } from '../../atoms/Image';
import { BannerText } from '../../molecules/BannerText';
import { ActionButton } from '../../molecules/ActionButton';

export interface HeroBannerProps {
  title: string;
  subtitle: string;
  buttonText: string;
  style?: number;
  onButtonClick?: () => void;
}

export const HeroBanner = ({
  title,
  subtitle,
  buttonText,
  style = 1,
  onButtonClick,
}: HeroBannerProps) => {
  return (
    <div className="relative h-96 md:h-[500px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          type="banner"
          style={style}
          alt={title}
          className="w-full h-full"
        />
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
      
      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-6 flex items-center">
        <div className="max-w-2xl space-y-6">
          <BannerText headline={title} subtitle={subtitle} />
          <ActionButton
            text={buttonText}
            action="watch"
            onClick={onButtonClick}
          />
        </div>
      </div>
    </div>
  );
};