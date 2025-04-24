import React from 'react';
import Layout from '@theme/Layout';
import Header from '@site/src/components/pages/legal/imprint-header';
import Content from '@site/src/components/pages/legal/imprint-content';

export default function LegalImprint() {
  const [language, changeLanguage] = React.useState('EN');

  return (
    <Layout title={`elbwalker imprint`} description="who dis?!">
      <Header changeLanguage={changeLanguage} />
      <Content language={language} />
    </Layout>
  );
}
