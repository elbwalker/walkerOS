import { assign } from '@walkeros/core';
import { Link } from '../../atoms/Link';
import { Text } from '../../atoms/Text';
import { SocialLinks } from '../../molecules/SocialLinks';
import { copyright, footerLinks } from '../../data';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';

export interface FooterProps {
  links?: string[];
  dataElb?: DataElb;
}

export const Footer = ({ links = footerLinks, dataElb }: FooterProps) => {
  const trackingProps = createTrackingProps(
    assign({ trigger: 'visible', action: 'read' }, dataElb),
  );

  return (
    <footer {...trackingProps} className="border-t border-border bg-bg">
      <div className="mx-auto max-w-(--container) px-(--gutter) py-(--section-y)">
        <nav
          aria-label="Footer"
          className="flex flex-wrap justify-center gap-x-12 gap-y-4"
        >
          {links.map((link) => (
            <Link key={link} className="text-ui">
              {link}
            </Link>
          ))}
        </nav>
        <SocialLinks className="mt-10" />
        <Text
          variant="small"
          tone="fg-3"
          className="mt-10 text-center font-normal"
        >
          {copyright}
        </Text>
      </div>
    </footer>
  );
};
