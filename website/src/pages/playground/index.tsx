import { JSX } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import { PromotionReady } from '@site/src/components/templates/promotionLive';

export default function Playground(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="Playground" description="Learn how to use walkerOS">
      <PromotionReady />
    </Layout>
  );
}
