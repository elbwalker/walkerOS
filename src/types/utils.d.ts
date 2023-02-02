import { IElbwalker } from './elbwalker';

export namespace Utils {
  namespace Storage {
    const enum Type {
      Cookie = 0,
      Local = 1,
      Session = 2,
    }

    interface Value {
      e: number; // Expiration timestamp
      v: string; // Value
    }
  }

  interface SessionStart {
    elbLayer?: IElbwalker.ElbLayer;
  }
}
