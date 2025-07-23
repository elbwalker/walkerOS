// Shared mapping utilities for all Google tools

export function normalizeEventName(
  eventName: string,
  snakeCase = true,
): string {
  if (!snakeCase) return eventName;

  return eventName.replace(/\s+/g, '_').toLowerCase();
}
