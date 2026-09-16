import React from 'react';
import Layout from '@theme/Layout';
import styles from '@site/src/components/landing/landing.module.css';
import Hero from '@site/src/components/landing/hero';
import Problems from '@site/src/components/landing/problems';
import Splits from '@site/src/components/landing/splits';
import Circuit from '@site/src/components/landing/circuit';
import Personas from '@site/src/components/landing/personas';
import Workshop from '@site/src/components/landing/workshop';
import Plans from '@site/src/components/landing/plans';
import Faq from '@site/src/components/landing/faq';
import Closing from '@site/src/components/landing/closing';

export default function Home() {
  return (
    <Layout
      title="Tracking that ships with the component"
      description="Tag it once in the markup, and every place that component gets reused is already tracked. MIT licensed, self-hostable walkerOS."
    >
      <main className={styles.page}>
        <Hero />
        <div className={styles.wrap}>
          <Problems />
          <Splits />
          <Circuit />
          <Personas />
          <Workshop />
          <Plans />
        </div>
        <Faq />
        <Closing />
      </main>
    </Layout>
  );
}
