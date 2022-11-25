export namespace Utils {
  namespace Storage {
    const enum Type {
      Cookie = 'cookie',
      Local = 'local',
      Session = 'session',
    }

    interface Value {
      e: number; // Expiration timestamp
      v: string; // Value
    }
  }
}
