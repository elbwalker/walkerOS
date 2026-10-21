/** A script element, as far as `loadVendor` uses one. */
export type MockScript = {
  src: string;
  async: boolean;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  addEventListener(type: string, listener: () => void): void;
};

/** A document, as far as `loadVendor` injects into one. */
export type MockScriptDocument = {
  querySelectorAll(selector: string): MockScript[];
  createElement(tagName: string): MockScript;
  head: { appendChild(script: MockScript): void };
};

/**
 * A document without a DOM for `loadVendor` to inject into, for an examples
 * env (tests, simulation in Node). It keeps the scripts appended to its head,
 * so each src goes in once, and an appended script loads at once.
 */
export function mockScriptDocument(): MockScriptDocument {
  const scripts: MockScript[] = [];
  const loads = new WeakMap<MockScript, Array<() => void>>();

  return {
    querySelectorAll: () => [...scripts],
    createElement: () => {
      const attributes = new Map<string, string>();
      const script: MockScript = {
        src: '',
        async: false,
        getAttribute: (name) =>
          name === 'src' ? script.src : (attributes.get(name) ?? null),
        setAttribute: (name, value) => {
          attributes.set(name, value);
        },
        addEventListener: (type, listener) => {
          if (type === 'load')
            loads.set(script, [...(loads.get(script) ?? []), listener]);
        },
      };
      return script;
    },
    head: {
      appendChild: (script) => {
        scripts.push(script);
        (loads.get(script) ?? []).forEach((listener) => listener());
      },
    },
  };
}
