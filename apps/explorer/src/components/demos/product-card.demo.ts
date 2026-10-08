// The demo product card: a page built from the walkerOS design components,
// tagged with walkerOS data attributes, written into the preview iframe (which
// carries the design CSS). One definition for the Playground and the stories
// that show a product card.

/**
 * The design components' markup the card uses, each exactly what the
 * component renders with the demo's tagging (pinned by
 * `__tests__/product-card.demo.test.tsx`).
 */
export const productCardMarkup = {
  /** `<Card padding="sm" className="product-card" data-elb="product" data-elbaction="load:view" data-elbcontext="stage:inspire">`, its opening tag. */
  cardOpen:
    '<div data-elb="product" data-elbaction="load:view" data-elbcontext="stage:inspire" class="elb-card elb-card--pad-sm product-card">',
  /** `<PhotoPlaceholder tone="viz" className="product-photo" />` */
  photo:
    '<div aria-hidden="true" class="elb-photo elb-photo--viz product-photo" data-theme="dark">photo</div>',
  /** `<Text data-elb-product="badge:delicious">Delicious</Text>` */
  badge: '<p data-elb-product="badge:delicious" class="elb-text">Delicious</p>',
  /** `<Text tone="fg" data-elb-product="price:2.50">€ 2.50 <s data-elb-product="old_price:3.14">€ 3.14</s></Text>` */
  price:
    '<p data-elb-product="price:2.50" class="elb-text elb-text--fg">€ 2.50 <s data-elb-product="old_price:3.14">€ 3.14</s></p>',
  /** `<Button block data-elbaction="click:add">Add to Cart</Button>` */
  add: '<button data-elbaction="click:add" type="button" class="elb-btn elb-btn--primary elb-btn--block">Add to Cart</button>',
  /** `<Button variant="secondary" block data-elbaction="click:save">Maybe later</Button>` */
  save: '<button data-elbaction="click:save" type="button" class="elb-btn elb-btn--secondary elb-btn--block">Maybe later</button>',
} as const;

const { cardOpen, photo, badge, price, add, save } = productCardMarkup;

/** The card's tagged HTML: a load view, a taste select, add and save clicks. */
export const productCardHtml = `${cardOpen}
  ${photo}
  ${badge}
  <h3 data-elb-product="name:#innerText" class="product-title">Everyday Ruck Snack</h3>
  <label class="product-taste">
    Taste
    <select data-elb-product="taste:#value">
      <option value="sweet">Sweet</option>
      <option value="spicy">Spicy</option>
    </select>
  </label>
  ${price}
  <div data-elbcontext="stage:hooked" class="product-actions">
    ${add}
    ${save}
  </div>
</div>
<span data-elbglobals="language:en"></span>`;

/** What the design components leave to the page: the card's width, the photo's size, the title, the select and the old price. */
export const productCardCss = `.product-card {
  max-width: var(--container-xs);
  margin: 0 auto;
}

.product-photo {
  height: 100px;
  border-radius: var(--radius-md);
}

.product-title {
  font-size: var(--type-title-card-size);
  line-height: var(--type-title-card-line-height);
  font-weight: var(--type-title-card-weight);
}

.product-taste {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--fg-2);
  font-size: var(--type-product-small-size);
}

.product-taste select {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  background: var(--bg);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--fg);
  font: inherit;
  font-size: var(--type-product-body-size);
}

.product-card s {
  color: var(--fg-3);
}

.product-actions {
  display: grid;
  gap: var(--space-2);
}`;
