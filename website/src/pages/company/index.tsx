import { JSX } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Mission from './mission';
import Values from './values';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

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
