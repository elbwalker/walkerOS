import React from 'react';
import Layout from '@theme/Layout';
import LegalPrivacyHeader from '@site/src/components/legal/privacy-header';
import LegalPrivacyContent from '@site/src/components/legal/privacy-content';

export default function LegalPrivacy(): JSX.Element {
  const [language, changeLanguage] = React.useState('EN');

  return (
    <Layout title={`Privacy Policy`} description="read carefully, that's important">
      <LegalPrivacyHeader changeLanguage={changeLanguage} />
      <LegalPrivacyContent language={language} />
    </Layout>
  );
}
