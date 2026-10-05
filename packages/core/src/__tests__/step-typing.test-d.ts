/**
 * Compile-time contract for the typed step helpers behind `startFlow`
 * (`types/util.ts`, bound per kind as `Init<Kind>Entry` / `Init<Kind>sOf`).
 * The `startFlow` behaviour itself is pinned in
 * `collector/src/__tests__/start-flow-types.test-d.ts`.
 */
import type {
  Collector,
  Destination,
  Source,
  Store,
  Transformer,
} from '../types';
import type { WidenConfig } from '../types/util';
import type { Equal, Expect } from '../schemas/__tests__/type-utils';

type SourceFx = Source.Types<{ mode: 'auto' | 'manual' }>;
declare const sourceFx: Source.Init<SourceFx>;
type DestinationFx = Destination.Types<{ region: 'eu' | 'us' }>;
declare const destinationFx: Destination.Instance<DestinationFx>;
type TransformerFx = Transformer.Types<{ rotate: 'daily' | 'hourly' }>;
declare const transformerFx: Transformer.Init<TransformerFx>;
type StoreFx = Store.Types<{ basePath: string }>;
declare const storeFx: Store.Init<StoreFx>;

// Per entry: an entry with nothing inferable or with the bare default Types
// falls back to the kind's TypesGeneric, alone; a typed entry keeps its Types.
type _Sources = Expect<
  Equal<
    Source.InitSourcesOf<{
      none: unknown;
      bare: Source.Types;
      typed: SourceFx;
    }>,
    {
      none: Source.InitSourceEntry<Source.TypesGeneric>;
      bare: Source.InitSourceEntry<Source.TypesGeneric>;
      typed: Source.InitSourceEntry<SourceFx>;
    }
  >
>;
type _Destinations = Expect<
  Equal<
    Destination.InitDestinationsOf<{
      none: unknown;
      bare: Destination.Types;
      typed: DestinationFx;
    }>,
    {
      none: Destination.InitDestinationEntry<Destination.TypesGeneric>;
      bare: Destination.InitDestinationEntry<Destination.TypesGeneric>;
      typed: Destination.InitDestinationEntry<DestinationFx>;
    }
  >
>;
type _Transformers = Expect<
  Equal<
    Transformer.InitTransformersOf<{
      none: unknown;
      bare: Transformer.Types;
      typed: TransformerFx;
    }>,
    {
      none: Transformer.InitTransformerEntry<Transformer.TypesGeneric>;
      bare: Transformer.InitTransformerEntry<Transformer.TypesGeneric>;
      typed: Transformer.InitTransformerEntry<TransformerFx>;
    }
  >
>;
type _Stores = Expect<
  Equal<
    Store.InitStoresOf<{ none: unknown; bare: Store.Types; typed: StoreFx }>,
    {
      none: Store.InitStoreEntry<Store.TypesGeneric>;
      bare: Store.InitStoreEntry<Store.TypesGeneric>;
      typed: Store.InitStoreEntry<StoreFx>;
    }
  >
>;

// Widening: what a config declared in a separate variable looks like.
interface Wide {
  literal: 'a' | 'b';
  plain: string;
  count?: 1 | 2;
  flag: true;
  format: (n: number) => string;
  nested: { level: 'low' | 'high' };
  list: ('x' | 'y')[];
  client: { send: (body: string) => void; mode: 'm' };
}
type W = WidenConfig<Wide>;
type _Literal = Expect<Equal<W['literal'], 'a' | 'b' | (string & {})>>;
type _Plain = Expect<Equal<W['plain'], string>>;
type _Count = Expect<Equal<W['count'], 1 | 2 | (number & {}) | undefined>>;
type _Flag = Expect<Equal<W['flag'], boolean>>;
type _Format = Expect<Equal<W['format'], (n: number) => string>>;
type _Nested = Expect<
  Equal<W['nested']['level'], 'low' | 'high' | (string & {})>
>;
type _List = Expect<Equal<W['list'], readonly ('x' | 'y' | (string & {}))[]>>;
// An object with a method is a value (client, DOM node), not plain data.
type _Client = Expect<Equal<W['client'], Wide['client']>>;
type _Unknown = Expect<Equal<WidenConfig<unknown>, unknown>>;

// Inference: each map is inferred per entry from `code`.
declare function inferConfig<S, D, T, St>(
  config: Collector.InitConfigOf<S, D, T, St>,
): { sources: S; destinations: D; transformers: T; stores: St };
const inferred = inferConfig({
  sources: { fx: { code: sourceFx } },
  destinations: { fx: { code: destinationFx } },
  transformers: { fx: { code: transformerFx }, hop: { next: 'fx' } },
  stores: { fx: { code: storeFx, config: { settings: { basePath: '/' } } } },
});
type Inferred = typeof inferred;
type _InferSource = Expect<Equal<Inferred['sources']['fx'], SourceFx>>;
type _InferDestination = Expect<
  Equal<Inferred['destinations']['fx'], DestinationFx>
>;
type _InferTransformer = Expect<
  Equal<Inferred['transformers']['fx'], TransformerFx>
>;
type _InferHop = Expect<
  Equal<
    Transformer.InitTransformersOf<Pick<Inferred['transformers'], 'hop'>>,
    { hop: Transformer.InitTransformerEntry<Transformer.TypesGeneric> }
  >
>;
type _InferStore = Expect<Equal<Inferred['stores']['fx'], StoreFx>>;
