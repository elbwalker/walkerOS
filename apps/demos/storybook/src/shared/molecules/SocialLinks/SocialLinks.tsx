import { Icon, type IconName } from '../../atoms/Icon';
import { Link } from '../../atoms/Link';
import { useText } from '../../language';

const socials: Array<{ label: string; icon: IconName }> = [
  { label: 'Facebook', icon: 'facebook' },
  { label: 'Instagram', icon: 'instagram' },
  { label: 'Twitter', icon: 'twitter' },
  { label: 'GitHub', icon: 'github' },
  { label: 'YouTube', icon: 'youtube' },
];

export interface SocialLinksProps {
  className?: string;
}

export const SocialLinks = ({ className = '' }: SocialLinksProps) => {
  const t = useText();
  return (
    <div className={`flex justify-center gap-10 ${className}`}>
      {socials.map(({ label, icon }) => (
        <Link key={label}>
          <span className="sr-only">{t(label)}</span>
          <Icon name={icon} className="size-6" />
        </Link>
      ))}
    </div>
  );
};
