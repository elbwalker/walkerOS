import { useState, useEffect } from 'react';

type ConsentState = 'unknown' | 'accepted' | 'denied';

function ConsentBar() {
  const [consentState, setConsentState] = useState<ConsentState>('unknown');
  const consentKey = 'walker_consent';

  useEffect(() => {
    // Check initial consent state from localStorage
    const storedConsent = localStorage.getItem(consentKey);
    if (storedConsent) {
      setConsentState(storedConsent as ConsentState);
    }

    // Listen for consent changes
    const handleStorageChange = () => {
      const newConsent = localStorage.getItem(consentKey);
      setConsentState(newConsent ? (newConsent as ConsentState) : 'unknown');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(consentKey, 'accepted');
    setConsentState('accepted');

    // Update walker consent
    window.elb('walker consent', {
      functional: true,
      analytics: true,
      marketing: true,
    });
  };

  const handleDeny = () => {
    localStorage.setItem(consentKey, 'denied');
    setConsentState('denied');

    // Update walker consent
    window.elb('walker consent', {
      functional: true,
      analytics: false,
      marketing: false,
    });
  };

  const handleReset = () => {
    localStorage.removeItem(consentKey);
    setConsentState('unknown');

    // Reset walker consent
    window.elb('walker consent', {});
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 sm:flex sm:justify-center sm:px-6 sm:pb-5 lg:px-8">
      <div className="pointer-events-auto flex items-center justify-between gap-x-6 bg-gray-900 py-2.5 px-6 sm:rounded-xl sm:py-3 sm:pr-3.5 sm:pl-4">
        <p className="text-sm leading-6 text-white">
          <strong className="font-semibold">Consent?</strong>
          Status:{' '}
          <span id="consent_state" className="font-mono">
            {consentState}
          </span>
        </p>
        <div className="flex gap-x-2">
          <button
            onClick={handleAccept}
            className="rounded inline-flex items-center px-4 py-2 leading-none text-white bg-green-500 hover:bg-green-700 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={handleReset}
            className="rounded inline-flex items-center px-4 py-2 leading-none text-white bg-gray-600 hover:bg-gray-800 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleDeny}
            className="rounded inline-flex items-center px-4 py-2 leading-none text-white bg-red-600 hover:bg-red-800 transition-colors"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConsentBar;
