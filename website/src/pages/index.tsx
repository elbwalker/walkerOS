import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Hero from '@site/src/components/home/hero';
import CTAStart from '@site/src/components/ctas/start';
import Testimonial from '@site/src/components/home/testimonial';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />"
    >
      <Hero />
      <main>
        <HomepageFeatures />
        <Testimonial />
        <CTAStart position="bottom" />
      </main>
    </Layout>
  );
}
