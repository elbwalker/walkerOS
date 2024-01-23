import React from 'react';
import Layout from '@theme/Layout';
import LegalTermsHeader from '@site/src/components/legal/terms-header';
import LegalTermsContent from '@site/src/components/legal/terms-content';

export default function LegalTerms() {
  const [language, changeLanguage] = React.useState('EN');

  return (
    <Layout title={`elbwalker terms of services`} description="how we make business">
      <LegalTermsHeader changeLanguage={changeLanguage} />
      <LegalTermsContent language={language} />
    </Layout>
  );
}
