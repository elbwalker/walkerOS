import React from 'react';
import LegalImprintContentDE from './imprint-de';
import LegalImprintContentEN from './imprint-en';

export default function LegalImprintContent({ language }) {
  return (
    <div className="relative overflow-hidden">
      {language == 'DE' ? <LegalImprintContentDE /> : <LegalImprintContentEN />}
    </div>
  );
}
