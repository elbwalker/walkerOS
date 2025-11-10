import { JSX } from 'react';
import Layout from '@theme/Layout';
import { PromotionPlayground } from '@walkeros/explorer';

export default function PlaygroundPage(): JSX.Element {
  return (
    <Layout title="Playground" description="Interactive walkerOS playground">
      <div style={{ padding: '2rem' }}>
        <PromotionPlayground />
      </div>
    </Layout>
  );
}
