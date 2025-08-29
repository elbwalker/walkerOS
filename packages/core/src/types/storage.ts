export type StorageType = 'local' | 'session' | 'cookie';

export const Storage = {
  Local: 'local' as const,
  Session: 'session' as const,
  Cookie: 'cookie' as const,
} as const;

export const Const = {
  Utils: {
    Storage,
  },
} as const;
