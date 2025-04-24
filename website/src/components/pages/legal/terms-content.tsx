import React from 'react';
import LegalTermsContentDE from './terms-de';
import LegalTermsContentEN from './terms-en';

export default function LegalTermsContent({ language }) {
  return (
    <div className="relative overflow-hidden">
      {language == 'DE' ? <LegalTermsContentDE /> : <LegalTermsContentEN />}
    </div>
  );
}
