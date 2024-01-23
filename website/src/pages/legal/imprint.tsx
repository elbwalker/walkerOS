import React from 'react';
import Layout from '@theme/Layout';
import LegalImprintHeader from '@site/src/components/legal/imprint-header';
import LegalImprintContent from '@site/src/components/legal/imprint-content';

export default function LegalImprint() {
  const [language, changeLanguage] = React.useState('EN');

  return (
    <Layout title={`elbwalker imprint`} description="who dis?!">
      <LegalImprintHeader changeLanguage={changeLanguage} />
      <LegalImprintContent language={language} />
    </Layout>
  );
}
