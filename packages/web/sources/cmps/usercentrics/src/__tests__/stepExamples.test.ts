import { examples } from '../dev';
import {
  createMockElb,
  createMockWindow,
  createUsercentricsSource,
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
    const eventDetail = example.in as Record<string, unknown>;
    const expected = example.out as Record<string, boolean>;

    const mockWindow = createMockWindow();
    await createUsercentricsSource(mockWindow, mockElb);

    // Dispatch ucEvent with the step example input as detail
    mockWindow.__dispatchEvent('ucEvent', eventDetail as never);

    expect(consentCalls.length).toBeGreaterThan(0);
    const lastConsent = consentCalls[consentCalls.length - 1].consent;
    expect(lastConsent).toEqual(expected);
  });
});
