import { JSX } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import CompanyValues from '../components/company/values';
import CompanyMission from '../components/company/mission';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title="About"
      description="elbwalker creates a new and open standard to measure user behavior."
    >
      <main>
        <CompanyMission />
        <CompanyValues />
      </main>
    </Layout>
  );
}
