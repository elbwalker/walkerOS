/**
 * Compile-time contract for the typed `startFlow` config.
 *
 * Every step entry is checked against the Types inferred from its own `code`;
 * an entry without inferable Types stays loose alone, never its siblings.
 * The helper rules (fallback, widening, inference) are pinned in
 * `core/src/__tests__/step-typing.test-d.ts`. Checked by the package
 * `tsc --noEmit`; jest never runs `.test-d.ts` files.
 */
import type {
  Collector,
  Destination,
  Elb,
  Source,
  Store,
  Transformer,
} from '@walkeros/core';
import { startFlow } from '..';

// Fixtures: one Types bundle per kind, each with a literal union, a required
// field and a callback setting. The destination adds a nested plain object,
// an array of literals and an object with a method.

interface SourceSettings {
  mode: 'auto' | 'manual';
  label: string;
  format?: (n: number) => string;
}
interface SourceEnv extends Source.BaseEnv {
  window: { location: { href: string }; dataLayer: unknown[] };
}
type SourceFx = Source.Types<
  SourceSettings,
  unknown,
  Elb.Fn,
  SourceEnv,
  Partial<SourceSettings>
>;
declare const sourceFx: Source.Init<SourceFx>;

interface DestinationSettings {
  region: 'eu' | 'us';
  apiKey: string;
  format?: (n: number) => string;
  options?: { level: 'low' | 'high'; retries?: number };
  tags?: ('a' | 'b')[];
  client?: { send: (body: string) => void };
}
interface DestinationMapping {
  track?: 'event' | 'page';
}
interface DestinationEnv extends Destination.BaseEnv {
  window: { vendor: (name: string) => void; queue: unknown[] };
}
type DestinationFx = Destination.Types<
  DestinationSettings,
  DestinationMapping,
  DestinationEnv,
  Partial<DestinationSettings>
>;
declare const destinationFx: Destination.Instance<DestinationFx>;

interface TransformerSettings {
  rotate: 'daily' | 'hourly';
  salt: string;
  format?: (n: number) => string;
}
type TransformerFx = Transformer.Types<
  TransformerSettings,
  Transformer.BaseEnv,
  Partial<TransformerSettings>
>;
declare const transformerFx: Transformer.Init<TransformerFx>;

interface StoreSettings {
  basePath: string;
  mode?: 'read' | 'write';
}
type StoreFx = Store.Types<StoreSettings>;
declare const storeFx: Store.Init<StoreFx>;

// (1) Positive: all four kinds, typed settings and mapping rule settings.
void startFlow({
  sources: {
    fx: { code: sourceFx, config: { settings: { mode: 'auto' } } },
  },
  destinations: {
    fx: {
      code: destinationFx,
      config: {
        settings: {
          region: 'eu',
          options: { level: 'high' },
          tags: ['a', 'b'],
          client: { send: (body) => void body.length },
        },
        mapping: { order: { complete: { settings: { track: 'event' } } } },
      },
    },
  },
  transformers: {
    fx: { code: transformerFx, config: { settings: { rotate: 'daily' } } },
  },
  stores: {
    fx: { code: storeFx, config: { settings: { basePath: '/tmp' } } },
  },
});

// (2) Negatives per kind: an unknown key and a wrong value kind. A literal
// setting also accepts its primitive (see 7b), so a string outside a string
// literal union is not an error; its completions still list the literals.
void startFlow({
  sources: {
    fx: {
      code: sourceFx,
      config: {
        settings: {
          // @ts-expect-error source: unknown setting
          nope: 1,
        },
      },
    },
  },
});
void startFlow({
  sources: {
    fx: {
      code: sourceFx,
      config: {
        settings: {
          // @ts-expect-error source: wrong value kind
          mode: 1,
        },
      },
    },
  },
});
void startFlow({
  destinations: {
    fx: {
      code: destinationFx,
      config: {
        settings: {
          // @ts-expect-error destination: unknown setting
          nope: 1,
        },
      },
    },
  },
});
void startFlow({
  destinations: {
    fx: {
      code: destinationFx,
      config: {
        settings: {
          // @ts-expect-error destination: wrong value type
          apiKey: 1,
        },
      },
    },
  },
});
void startFlow({
  transformers: {
    fx: {
      code: transformerFx,
      config: {
        settings: {
          // @ts-expect-error transformer: unknown setting
          nope: 1,
        },
      },
    },
  },
});
void startFlow({
  transformers: {
    fx: {
      code: transformerFx,
      config: {
        settings: {
          // @ts-expect-error transformer: wrong value kind
          rotate: 1,
        },
      },
    },
  },
});
void startFlow({
  stores: {
    fx: {
      code: storeFx,
      config: {
        settings: {
          basePath: '/tmp',
          // @ts-expect-error store: unknown setting
          nope: 1,
        },
      },
    },
  },
});
void startFlow({
  stores: {
    fx: {
      code: storeFx,
      config: {
        settings: {
          // @ts-expect-error store: wrong value type
          basePath: 1,
        },
      },
    },
  },
});
void startFlow({
  stores: {
    fx: {
      code: storeFx,
      // @ts-expect-error store: a required setting is missing
      config: { settings: {} },
    },
  },
});

// (3) The settings of a destination mapping rule are checked.
void startFlow({
  destinations: {
    fx: {
      code: destinationFx,
      config: {
        mapping: {
          order: {
            complete: {
              settings: {
                // @ts-expect-error mapping rule: wrong value kind
                track: 1,
              },
            },
          },
        },
      },
    },
  },
});

// (4) A code-less transformer, an untyped inline mock and a context-sensitive
// mock or inline source do NOT erase the check on a typed sibling. A
// constraint-based map type fails exactly here.
void startFlow({
  transformers: {
    hop: { next: 'fx' },
    fx: {
      code: transformerFx,
      config: {
        settings: {
          // @ts-expect-error still checked next to a code-less hop
          rotate: 1,
        },
      },
    },
  },
});
void startFlow({
  destinations: {
    mock: {
      code: { type: 'mock', config: {}, push: () => undefined },
      config: { settings: { anything: 1 } },
    },
    fx: {
      code: destinationFx,
      config: {
        settings: {
          // @ts-expect-error still checked next to an untyped mock
          nope: 1,
        },
      },
    },
  },
});
void startFlow({
  destinations: {
    mock: { code: { type: 'mock', config: {}, push: (event) => void event } },
    fx: {
      code: destinationFx,
      config: {
        settings: {
          // @ts-expect-error still checked next to a context-sensitive mock
          nope: 1,
        },
      },
    },
  },
});
void startFlow({
  sources: {
    inline: {
      code: async (ctx) => ({
        type: 'inline',
        config: {},
        push: ctx.env.push,
      }),
    },
    fx: {
      code: sourceFx,
      config: {
        settings: {
          // @ts-expect-error still checked next to a context-sensitive source
          nope: 1,
        },
      },
    },
  },
});

// (5) Code typed with the bare default Types keeps today's looseness, alone.
void startFlow({
  sources: {
    dep: {
      code: async (ctx: Source.Context) => ({
        type: 'dep',
        config: {},
        push: ctx.env.push,
      }),
      config: { settings: { anything: 1 } },
    },
    fx: { code: sourceFx, config: { settings: { mode: 'manual' } } },
  },
  transformers: {
    inline: {
      code: (ctx) => ({
        type: 'inline',
        config: ctx.config,
        push: (event) => ({ event }),
      }),
    },
  },
});

// (6) Contextual typing reaches settings, the tsc proxy for autocompletion:
// the unannotated `n` compiles under noImplicitAny only when `settings` is
// contextually typed.
void startFlow({
  sources: {
    fx: { code: sourceFx, config: { settings: { format: (n) => `${n}` } } },
  },
  destinations: {
    fx: {
      code: destinationFx,
      config: { settings: { format: (n) => n.toFixed(2) } },
    },
  },
  transformers: {
    fx: {
      code: transformerFx,
      config: { settings: { format: (n) => `${n}` } },
    },
  },
});
void startFlow({
  destinations: {
    fx: {
      code: destinationFx,
      config: {
        settings: {
          // @ts-expect-error n is a number, not a string
          format: (n) => n.toUpperCase(),
        },
      },
    },
  },
});

// (7) Pre-annotated erased values keep working (app, createTrigger and
// walkerjs build configs this way).
const erased: Collector.InitConfig = {
  sources: { fx: { code: sourceFx, config: { settings: { anything: 1 } } } },
  destinations: { fx: { code: destinationFx } },
  transformers: { fx: { code: transformerFx }, hop: { next: 'fx' } },
  stores: { fx: { code: storeFx } },
};
void startFlow(erased);
const prebuilt: Destination.InitDestinations = { fx: { code: destinationFx } };
void startFlow({ destinations: prebuilt });

// (7b) A config declared in a separate variable, or checked with
// `satisfies Collector.InitConfig`, widens its literals (`'daily'` becomes
// `string`). The widened form is accepted, through nested plain objects and
// arrays, as before typing; value kinds stay checked. `as const` also works.
const separateTransformers = {
  fx: {
    code: transformerFx,
    config: { settings: { rotate: 'daily', salt: 's' } },
  },
};
void startFlow({ transformers: separateTransformers });
const separateDestinations = {
  fx: {
    code: destinationFx,
    config: {
      settings: {
        region: 'eu',
        options: { level: 'low' },
        tags: ['a'],
        client: { send: (body: string) => void body },
      },
      mapping: { order: { complete: { settings: { track: 'event' } } } },
    },
  },
};
void startFlow({ destinations: separateDestinations });
const satisfied = {
  sources: { fx: { code: sourceFx, config: { settings: { mode: 'auto' } } } },
  stores: {
    fx: {
      code: storeFx,
      config: { settings: { basePath: '/', mode: 'read' } },
    },
  },
} satisfies Collector.InitConfig;
void startFlow(satisfied);
const asConst = {
  fx: {
    code: destinationFx,
    config: { settings: { region: 'us', tags: ['b'] } },
  },
} as const;
void startFlow({ destinations: asConst });
const separateWrongKind = {
  fx: { code: transformerFx, config: { settings: { rotate: 1 } } },
};
// @ts-expect-error a separate variable is still checked for value kinds
void startFlow({ transformers: separateWrongKind });

// (8) An explicit type argument turns inference off (TS has no partial
// type-argument inference): the call stays as loose as before.
void startFlow<Elb.Fn>({
  destinations: {
    fx: { code: destinationFx, config: { settings: { nope: 1 } } },
  },
});

// (9) Deep-partial env mocks stay legal; a typed env key is offered.
void startFlow({
  sources: {
    fx: { code: sourceFx, env: { window: { location: { href: 'x' } } } },
  },
  destinations: {
    fx: { code: destinationFx, env: { window: { vendor: () => undefined } } },
  },
  stores: {
    fx: {
      code: storeFx,
      config: { settings: { basePath: '/tmp' } },
      env: { anything: 1 },
    },
  },
});
