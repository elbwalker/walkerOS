import { examples } from '../dev';
import {
  createMockElb,
  createMockWindow,
  createCookieFirstSource,
  ConsentCall,
} from './test-utils';

describe('Step Examples', () => {
  let consentCalls: ConsentCall[];
  let mockElb: ReturnType<typeof createMockElb>;

  beforeEach(() => {
    consentCalls = [];
    mockElb = createMockElb(consentCalls);
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const consent = example.in as Record<string, boolean>;
    const expected = example.out as Record<string, boolean>;

    // Init source with the consent already set
    const mockWindow = createMockWindow(consent as never);
    await createCookieFirstSource(mockWindow, mockElb);

    // Dispatch cf_init to trigger consent processing
    (
      mockWindow as unknown as { __dispatchEvent: (e: string) => void }
    ).__dispatchEvent('cf_init');

    expect(consentCalls.length).toBeGreaterThan(0);
    const lastConsent = consentCalls[consentCalls.length - 1].consent;
    expect(lastConsent).toEqual(expected);
  });
});
