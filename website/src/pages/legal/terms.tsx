import React from 'react';
import Layout from '@theme/Layout';
import Header from '@site/src/components/pages/legal/terms-header';
import Content from '@site/src/components/pages/legal/terms-content';

export default function LegalTerms() {
  const [language, changeLanguage] = React.useState('EN');

  return (
    <Layout
      title={`elbwalker terms of services`}
      description="how we make business"
    >
      <Header changeLanguage={changeLanguage} />
      <Content language={language} />
    </Layout>
  );
}
