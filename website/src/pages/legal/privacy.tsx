import React from 'react';
import Layout from '@theme/Layout';
import Header from '@site/src/components/pages/legal/privacy-header';
import Content from '@site/src/components/pages/legal/privacy-content';

export default function LegalPrivacy() {
  const [language, changeLanguage] = React.useState('EN');

  return (
    <Layout
      title={`Privacy Policy`}
      description="read carefully, that's important"
    >
      <Header changeLanguage={changeLanguage} />
      <Content language={language} />
    </Layout>
  );
}
