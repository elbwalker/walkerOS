import { JSX } from 'react';
import Layout from '@theme/Layout';
import { PromotionReady } from '@site/src/components/templates/flow-complete';

export default function EventFlowPage(): JSX.Element {
  return (
    <Layout title="Event Flow" description="Test the event flow component">
      <PromotionReady />
    </Layout>
  );
}
