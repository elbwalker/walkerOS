import type { ReactNode } from 'react';
import Layout from '@theme-original/Footer/Layout';
import type LayoutType from '@theme/Footer/Layout';
import type { WrapperProps } from '@docusaurus/types';

type Props = WrapperProps<typeof LayoutType>;

/** Docusaurus's footer with the walkerOS statement above the link columns. */
export default function FooterLayoutWrapper(props: Props): ReactNode {
  return (
    <Layout
      {...props}
      links={
        <>
          <p className="footer__statement">
            walkerOS is built by elbwalker, the analytics engineers from Hamburg
          </p>
          {props.links}
        </>
      }
    />
  );
}
