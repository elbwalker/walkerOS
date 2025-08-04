import { Image } from '../../atoms/Image';
import { BannerText } from '../../molecules/BannerText';
import { TaggedButton } from '../../molecules/TaggedButton';
import type { WalkerOSTagging } from '@walkeros/storybook-addon';

export interface HeroBannerProps extends WalkerOSTagging {
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
  elbEntity = 'teaser',
  elbTrigger = 'visible',
  elbAction,
  elbData = 'type:hero',
  elbContext,
}: HeroBannerProps) => {
  return (
    <div
      {...(elbEntity && { 'data-elb': elbEntity })}
      {...(elbTrigger && {
        'data-elbaction': elbTrigger + (elbAction ? ':' + elbAction : ''),
      })}
      {...(elbData && { [`data-elb-${elbEntity}`]: elbData })}
      {...(elbContext && { 'data-elbcontext': elbContext })}
      className="relative h-96 md:h-[500px] overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image type="banner" style={style} className="w-full h-full" />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-6 flex items-center">
        <div className="max-w-2xl space-y-6">
          <BannerText headline={title} subtitle={subtitle} />
          <TaggedButton
            label={buttonText}
            primary={true}
            onClick={onButtonClick}
            elbEntity="teaser"
            elbData="type:primary"
          />
        </div>
      </div>
    </div>
  );
};
