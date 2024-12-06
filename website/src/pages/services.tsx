import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Hero from '@site/src/components/services/hero';
import Features from '@site/src/components/services/features';
import CTAServices from '@site/src/components/ctas/services';
import Team from '../components/services/team';
import Sparring from '../components/services/sparring';
import Projects from '../components/services/projects';
import Principle from '../components/services/principles';
import Principles from '../components/services/principles';

export default function Services(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={`${siteConfig.title}`} description="Professional services">
      <Hero />
      <main>
        <Features />
        <Sparring />
        <Projects />
        <Team />
        <CTAServices />
      </main>
    </Layout>
  );
}
