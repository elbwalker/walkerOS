interface StoreLike<T> {
  type: string;
  config: unknown;
  get(key: string): T | undefined;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  destroy?(): void;
}

export function withNamespace<T>(
  store: StoreLike<T>,
  prefix: string,
): StoreLike<T> {
  const ns = (key: string) => `${prefix}:${key}`;

  return {
    type: store.type,
    config: store.config,
    get(key: string) {
      return store.get(ns(key));
    },
    set(key: string, value: T, ttl?: number) {
      return store.set(ns(key), value, ttl);
    },
    delete(key: string) {
      return store.delete(ns(key));
    },
    destroy() {
      return store.destroy?.();
    },
  };
}
