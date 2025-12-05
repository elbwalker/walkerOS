import { EventSchema } from '../schemas/event';
import { examples } from '../dev';

describe('EventSchema validation', () => {
  it('should validate example inputs', () => {
    const result = EventSchema.safeParse(examples.inputs.pageView);
    expect(result.success).toBe(true);
  });

  it('should validate complete event', () => {
    const result = EventSchema.safeParse(examples.inputs.completeEvent);
    expect(result.success).toBe(true);
  });

  it('should reject event without name', () => {
    const result = EventSchema.safeParse({ data: { title: 'Test' } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['name']);
    }
  });

  it('should validate batch array', () => {
    const result = EventSchema.array().safeParse(examples.inputs.batch);
    expect(result.success).toBe(true);
  });
});
