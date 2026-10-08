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
import type { IsExactly, Expect } from '../schemas/__tests__/type-utils';

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
  IsExactly<
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
  IsExactly<
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
  IsExactly<
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
  IsExactly<
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
type _Literal = Expect<IsExactly<W['literal'], 'a' | 'b' | (string & {})>>;
type _Plain = Expect<IsExactly<W['plain'], string>>;
type _Count = Expect<IsExactly<W['count'], 1 | 2 | (number & {}) | undefined>>;
type _Flag = Expect<IsExactly<W['flag'], boolean>>;
type _Format = Expect<IsExactly<W['format'], (n: number) => string>>;
type _Nested = Expect<
  IsExactly<W['nested']['level'], 'low' | 'high' | (string & {})>
>;
type _List = Expect<
  IsExactly<W['list'], readonly ('x' | 'y' | (string & {}))[]>
>;
// An object with a method is a value (client, DOM node), not plain data.
type _Client = Expect<IsExactly<W['client'], Wide['client']>>;
type _Unknown = Expect<IsExactly<WidenConfig<unknown>, unknown>>;

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
type _InferSource = Expect<IsExactly<Inferred['sources']['fx'], SourceFx>>;
type _InferDestination = Expect<
  IsExactly<Inferred['destinations']['fx'], DestinationFx>
>;
type _InferTransformer = Expect<
  IsExactly<Inferred['transformers']['fx'], TransformerFx>
>;
type _InferHop = Expect<
  IsExactly<
    Transformer.InitTransformersOf<Pick<Inferred['transformers'], 'hop'>>,
    { hop: Transformer.InitTransformerEntry<Transformer.TypesGeneric> }
  >
>;
type _InferStore = Expect<IsExactly<Inferred['stores']['fx'], StoreFx>>;
