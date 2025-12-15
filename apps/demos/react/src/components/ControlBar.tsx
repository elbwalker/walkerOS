import { useState, useEffect } from 'react';

type ConsentState = 'unknown' | 'accepted' | 'denied';

const consentKey = 'walker_consent';

function ControlBar() {
  // Use lazy initializer to read from localStorage on mount
  const [consentState, setConsentState] = useState<ConsentState>(() => {
    const stored = localStorage.getItem(consentKey);
    return stored ? (stored as ConsentState) : 'unknown';
  });

  useEffect(() => {
    // Listen for consent changes from other tabs/windows
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
    if (window.elb) {
      window.elb('walker consent', {
        functional: true,
        analytics: true,
        marketing: true,
      });
    }
  };

  const handleDeny = () => {
    localStorage.setItem(consentKey, 'denied');
    setConsentState('denied');

    // Update walker consent
    if (window.elb) {
      window.elb('walker consent', {
        functional: true,
        analytics: false,
        marketing: false,
      });
    }
  };

  const handleReset = () => {
    localStorage.removeItem(consentKey);
    setConsentState('unknown');

    // Reset walker consent
    if (window.elb) {
      window.elb('walker consent', {});
    }
  };

  // Element highlighting functions
  const toggleElbStyle = (name: string) => {
    document.body.classList.toggle(`elb-${name}`);
  };

  const toggleElbProperties = () => {
    document.querySelectorAll('[data-elb]').forEach((entity) => {
      const entityType = entity.getAttribute('data-elb');
      if (entityType) {
        entity.querySelectorAll(`[data-elb-${entityType}]`).forEach((prop) => {
          prop.classList.toggle('data-elbproperty');
        });
      }
    });
  };

  const toggleTest = () => {
    document.querySelectorAll('main').forEach((elem) => {
      elem.classList.toggle('test');

      if (elem.classList.contains('test')) {
        elem.setAttribute('data-elbcontext', 'font:beautiful');
      } else {
        elem.removeAttribute('data-elbcontext');
      }
    });
  };

  return (
    <div id="control-bar" className="w-full bg-gray-900 py-3 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-x-6 flex-wrap">
        {/* Consent Section */}
        <div className="flex items-center gap-x-4">
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
              className="rounded inline-flex items-center px-3 py-1.5 text-xs leading-none text-white bg-green-500 hover:bg-green-700 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={handleReset}
              className="rounded inline-flex items-center px-3 py-1.5 text-xs leading-none text-white bg-gray-600 hover:bg-gray-800 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleDeny}
              className="rounded inline-flex items-center px-3 py-1.5 text-xs leading-none text-white bg-red-600 hover:bg-red-800 transition-colors"
            >
              Deny
            </button>
          </div>
        </div>

        {/* Element Highlighting Section */}
        <div className="flex items-center gap-x-4">
          <p className="text-sm leading-6 text-white font-semibold">
            Element Highlighting:
          </p>
          <div className="isolate inline-flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => toggleElbStyle('globals')}
              className="elb-globals relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Highlight elements with data-elbglobals attributes"
            >
              Globals
            </button>
            <button
              type="button"
              onClick={() => toggleElbStyle('context')}
              className="elb-context relative -ml-px inline-flex items-center border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Highlight elements with data-elbcontext attributes"
            >
              Context
            </button>
            <button
              type="button"
              onClick={() => toggleElbStyle('entity')}
              className="elb-entity relative -ml-px inline-flex items-center border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Highlight elements with data-elb attributes"
            >
              Entity
            </button>
            <button
              type="button"
              onClick={toggleElbProperties}
              className="elb-property relative -ml-px inline-flex items-center border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Highlight elements with entity property attributes"
            >
              Property
            </button>
            <button
              type="button"
              onClick={() => toggleElbStyle('action')}
              className="elb-action relative -ml-px inline-flex items-center rounded-r-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Highlight elements with data-elbaction attributes"
            >
              Action
            </button>
          </div>

          {/* Test Button */}
          <div className="isolate inline-flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={toggleTest}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              title="Toggle test mode with Comic Sans font"
            >
              Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ControlBar;
