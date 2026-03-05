import { examples } from '../dev';
import {
  createMockElb,
  createMockWindow,
  createCookieProSource,
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
    const activeGroups = example.in as string;
    const expected = example.out as Record<string, boolean>;

    // Init source with SDK loaded and active groups set
    const mockWindow = createMockWindow({
      sdkLoaded: true,
      alertBoxClosed: true,
      activeGroups,
    });

    await createCookieProSource(mockWindow, mockElb);

    expect(consentCalls.length).toBeGreaterThan(0);
    const lastConsent = consentCalls[consentCalls.length - 1].consent;
    expect(lastConsent).toEqual(expected);
  });
});
