import { JSX } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Mission from '@site/src/components/pages/company/mission';
import Values from '@site/src/components/pages/company/values';

export default function Home(): JSX.Element {
  return (
    <Layout
      title="About"
      description="elbwalker creates a new and open standard to measure user behavior."
    >
      <main>
        <Mission />
        <Values />
      </main>
    </Layout>
  );
}
