import React from 'react';
import LegalPrivacyContentDE from './privacy-de';
import LegalPrivacyContentEN from './privacy-en';

export default function LegalPrivacyContent({ language }) {
  return (
    <div className="relative overflow-hidden">
      {language == 'DE' ? <LegalPrivacyContentDE /> : <LegalPrivacyContentEN />}
    </div>
  );
}
