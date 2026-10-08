/** The tagged product card the playground starts with. */
export const playgroundHtml = `<div class="wrap" data-elbglobals="language:en">
  <div class="wrap" data-elbcontext="stage:inspire">
    <div class="card" data-elb="product" data-elbaction="load:view">
      <div class="photo">photo</div>
      <p class="kicker">Delicious</p>
      <h3 data-elb-product="name:#innerText">Everyday Ruck Snack</h3>
      <label>Taste
        <select data-elb-product="taste:#value">
          <option value="sweet">Sweet</option>
          <option value="salty">Salty</option>
          <option value="spicy">Spicy</option>
        </select>
      </label>
      <p class="price">
        <span data-elb-product="price:2.5">€ 2.50</span>
        <s data-elb-product="old_price:3.14">€ 3.14</s>
      </p>
      <button class="primary" data-elbaction="click:add">Add to Cart</button>
      <button>Maybe later</button>
    </div>
  </div>
</div>`;

/**
 * The card's look, applied inside the preview's shadow root and not shown as a
 * tab. Custom properties inherit into a shadow root, so the design tokens work
 * here as on the page.
 */
export const playgroundCardCss = `
.wrap{padding:14px;border-radius:14px}
.card{display:flex;flex-direction:column;gap:12px;max-width:340px;margin:0 auto;padding:20px;color:var(--viz-fg);background:var(--viz-bg);border:1px solid var(--viz-border);border-radius:14px}
.photo{height:120px;border-radius:10px;display:flex;align-items:center;justify-content:center;font:var(--type-product-caption-size) var(--font-mono);color:var(--viz-comment);background:repeating-linear-gradient(135deg,var(--viz-surface) 0 10px,var(--viz-code-bg) 10px 20px)}
.kicker{margin:0;color:var(--viz-fg-2);font-size:var(--type-small-size)}
h3{margin:0;font-size:var(--type-title-card-size)}
label{display:flex;align-items:center;gap:12px;color:var(--viz-fg-2);font-size:var(--type-small-size)}
select{flex:1;padding:8px 10px;font:inherit;color:var(--viz-fg);background:var(--viz-code-bg);border:1px solid var(--viz-border);border-radius:8px}
.price{margin:0;display:flex;gap:8px;align-items:baseline;font-size:var(--type-body-size)}
.price s{color:var(--viz-comment);font-size:var(--type-small-size)}
button{padding:12px;border-radius:8px;cursor:pointer;font:600 var(--type-ui-size) var(--font-sans);color:var(--viz-fg);background:transparent;border:1px solid var(--viz-border)}
.primary{border:0;background:var(--primary);color:var(--on-primary)}
`;

/**
 * Outlines for the highlight chips, in the tagging-demo colours, and the pulse
 * on the click action until its first click. Toggled by classes on the host.
 */
export const playgroundHighlightCss = `
:host(.hl-entity) [data-hl~="entity"]{box-shadow:0 0 0 2px var(--event-entity)}
:host(.hl-property) [data-hl~="property"]{outline:1.5px solid var(--event-property);outline-offset:2px;border-radius:4px}
:host(.hl-action) [data-hl~="action"]{outline:2px solid var(--event-action);outline-offset:4px}
:host(.hl-context) [data-hl~="context"]{outline:1.5px dashed var(--event-context);outline-offset:-2px}
:host(.hl-globals) [data-hl~="globals"]{outline:1.5px dashed var(--event-globals);outline-offset:-2px}
@keyframes elbPgNudge{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--primary) 55%,transparent)}70%{box-shadow:0 0 0 12px transparent}100%{box-shadow:0 0 0 0 transparent}}
:host(.nudge) [data-nudge]{animation:elbPgNudge 1.6s var(--ease) infinite}
@media (prefers-reduced-motion: reduce){:host(.nudge) [data-nudge]{animation:none;outline:2px solid var(--primary);outline-offset:3px}}
`;

const ga4Rule = (name: string) => ({
  name,
  data: {
    map: {
      currency: { value: 'EUR' },
      value: 'data.price',
      items: {
        set: [
          {
            map: {
              item_name: 'data.name',
              item_variant: 'data.taste',
              price: 'data.price',
              quantity: { value: 1 },
            },
          },
        ],
      },
    },
  },
});

/** The GA4 mapping the editor starts with. */
export const playgroundMapping = JSON.stringify(
  { product: { view: ga4Rule('view_item'), add: ga4Rule('add_to_cart') } },
  null,
  2,
);

/** The measurement id the playground's gtag destination is configured with. */
export const playgroundMeasurementId = 'G-XXXXXXX';

/** The JS tab: the flow the playground runs, read-only. */
export const playgroundJs = `import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { destinationGtag } from '@walkeros/web-destination-gtag';
import mapping from './mapping.json';

await startFlow({
  sources: { browser: { code: sourceBrowser } },
  destinations: {
    ga4: {
      code: destinationGtag,
      config: { settings: { ga4: { measurementId: '${playgroundMeasurementId}' } }, mapping },
    },
  },
});`;
