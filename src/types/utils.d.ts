export namespace Utils {
  namespace Storage {
    const enum Type {
      Cookie = 'cookie',
      Local = 'local',
      Session = 'session',
    }

    interface Value {
      t: number;
      v: string;
    }
  }
}
