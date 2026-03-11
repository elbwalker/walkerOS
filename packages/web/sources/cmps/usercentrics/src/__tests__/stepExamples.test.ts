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

    // Pass config settings from mapping field if present
    const settings = example.mapping as Record<string, unknown> | undefined;
    const config = settings ? { settings } : undefined;

    // Determine which event name to dispatch on
    const eventName = (settings?.eventName as string | undefined) ?? 'ucEvent';

    const mockWindow = createMockWindow();
    await createUsercentricsSource(mockWindow, mockElb, config);

    // Dispatch event with the step example input as detail
    mockWindow.__dispatchEvent(eventName, eventDetail as never);

    expect(consentCalls.length).toBeGreaterThan(0);
    const lastConsent = consentCalls[consentCalls.length - 1].consent;
    expect(lastConsent).toEqual(expected);
  });
});
