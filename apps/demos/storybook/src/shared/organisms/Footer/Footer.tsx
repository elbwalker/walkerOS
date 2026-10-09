import { Link } from '../../atoms/Link';
import { Text } from '../../atoms/Text';
import { useText } from '../../language';
import { SocialLinks } from '../../molecules/SocialLinks';
import { createTrackingProps } from '../../tagger';

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterProps {
  links: FooterLink[];
  copyright: string;
}

export const Footer = ({ links, copyright }: FooterProps) => {
  const t = useText();
  return (
    <footer
      {...createTrackingProps({ trigger: 'visible', action: 'read' })}
      className="border-t border-border bg-bg"
    >
      <div className="mx-auto max-w-(--container) px-(--gutter) py-(--section-y)">
        <nav
          aria-label={t('Footer')}
          className="flex flex-wrap justify-center gap-x-12 gap-y-4"
        >
          {links.map((link) => (
            <Link key={link.label} href={link.href} className="text-ui">
              {t(link.label)}
            </Link>
          ))}
        </nav>
        <SocialLinks className="mt-10" />
        <Text
          variant="small"
          tone="fg-3"
          className="mt-10 text-center font-normal"
        >
          {t(copyright)}
        </Text>
      </div>
    </footer>
  );
};
