# Atomic Design Component Structure

This structure follows the atomic design methodology and provides a basis for
automatically generating component folders, files, and example content. Each
level (atom, molecule, organism) includes component names and associated example
props for use in Storybook.

One shared kit (`src/shared`, stories under `Shared/*`) serves every demo. Two
demos build on it: **Shop**, the static tagging demo (`apps/demos/tagging`) as
components, and **Media**, a streaming site. Every visible string goes through
the text function, so each component shows English or Elbish; tags stay English.

---

# Shared

## 🧪 Atoms

### Badge

- Example Text: "Schnapper"

### Button

- Variants: Primary, Secondary, Link, Icon; sizes md and sm
- Example Texts:
  - Primary: "Confirm order"
  - Secondary: "Add to cart"
  - Link: "Continue Shopping"

### Heading

- Levels: 1 to 4, sized by a design type style
- Example Texts: "Recommendations", "Our Top Series"

### Icon

- Types: Star, Check, Check circle, X circle, Info, Warning, Trash, Cart, Globe,
  Shield check, Search, Profile, Slash, Facebook, Instagram, Twitter, GitHub,
  YouTube

### Image

- Types: Thumbnail, Banner, Postcard; an offline placeholder
- Tags: `img`, `type`, `title`, `alt` as data, context `component:Image`

### Input

- Example: email address field

### Link

- Variants: Subtle, Primary, Secondary, Link
- Example Texts: "Get started", "Learn more"

### Price

- Example Amounts: "€140", "€220.00", "€5.52"

### Select

- Example Options:
  - Country: "United States", "Canada", "Mexico"
  - Quantity: 1 to 8

### StarRating

- Example: 4 out of 5 stars

### Text

- Variants: Lead, Body large, Body, UI, Small, Label, Eyebrow
- Example Text: "Open your console to see how we measure."

---

## ⚙️ Molecules

### ConsentControls

- Texts: "Accept", "Reset", "Decline"

### FormField

- Example Labels: "Email address", "Country"

### LanguageToggle

- Buttons: "English", "Elbish" (never translated)
- Tags: global `language:en` or `language:elbish`

### NavLinks

- The one-pager's anchors, such as "Promotion", "Recommendations"

### SocialLinks

- Links: Facebook, Instagram, Twitter, GitHub, YouTube

### StatusMessage

- Tones: Success, Danger, Warning, Info, each an icon and words
- Example Texts: "In stock and ready to ship", "Status: unknown"

### UserSwitch

- Personas: Anonymous, Lisa Loyal, Sam Sales (never translated)
- Tags: `data-elbuser` with the persona's user; none for Anonymous

---

## 🧩 Organisms

### Header

- Components:
  - Brand (optional)
  - NavLinks
  - LanguageToggle and UserSwitch (the controls)
  - A demo's extras: Shop's CartLink, Media's SearchButton

### Footer

- Components:
  - Link
  - SocialLinks
- Tags: `visible:read`

### ConsentBar

- Components:
  - StatusMessage (state and notice)
  - ConsentControls
- States: unknown, accepted, denied

---

## 🗂️ Templates

### OnePager

- Slots: header, sections, footer, consent bar (pinned to the bottom)

---

# Shop

Every component reads its content from `src/demos/shop/data.ts` and its tags
carry over from the static tagging demo.

## 🧪 Atoms

### ProductImage

- An offline placeholder named after the item
- Example Names: "Everyday Ruck Snack", "Cool Cap"

---

## ⚙️ Molecules

### Breadcrumb

- Example Items: "Travel", "Bags"
- Tags: `category:Travel/Bags` from the product detail

### CartLineItem

- Components: ProductImage, ProductFacts, Price, Select (quantity), Button
  (remove)
- Example Data: "Everyday Ruck Snack", Black, Large, €220.00
- Tags: entity `product`, `price;currency`, `quantity:#value`, remove
  `click:remove`

### CartLink

- Example Data: cart "€249"
- Tags: global `cart_value:249`

### OrderItem

- Components: ProductImage, ProductFacts, Price
- Example Data: "Cool Cap", Green, One Size, €39.00
- Tags: entity `product`, `price;currency`

### ProductCard

- Components: ProductImage, Heading, Badge, Price, Button
- Example Data: "Everyday Ruck Snack" €140, "Cool Cap" €39 with "Schnapper"
- Tags: entity `product` with `impression`, `click`, `name`, `price`, `flag`;
  "Add to cart" `click:add` in context `shopping:cart`

### ProductFacts

- Example Data: "Everyday Ruck Snack", Black, Large
- Tags: `name`, `color`, `size` of the `product`

### PromotionCard

- Example Data:
  - Title: "Setting up tracking easily"
  - Text: "Open your console to see how we measure."
  - Buttons: "Get started", "Learn more"
- Tags: entity `promotion` with `visible:view`, `category:analytics`,
  `name:#innerText`; `click:start`, `click:more`

### SummaryRow

- Example Data: "Shipping" €5.00, "Total" €269.52
- Tags: the amount as a property of `checkout` or `order`

---

## 🧩 Organisms

### PromotionHero

- Components:
  - PromotionCard
- Tags: context `test:engagement;category:analytics`

### Recommendations

- Components:
  - Heading
  - ProductCard
  - Button ("Add product", appends from the demo catalog)
- Section Title: "Recommendations"
- Tags: context `module:recommendations`; the grid `data-elbobserve` and
  `shopping:inspo`

### ProductDetail

- Components:
  - Breadcrumb
  - Heading, Price, StarRating, Text
  - StatusMessage
  - ProductImage
- Example Data: "Everyday Ruck Snack", €220, 1624 reviews
- Tags: context `shopping:detail`; entity `product` with `visible:view` and
  `id:rcksnck`

### Checkout

- Components:
  - FormField
  - CartLineItem
  - SummaryRow
  - Button ("Confirm order")
- Tags: context `shopping:checkout`; entity `checkout` with `visible:view`;
  `click:confirm`

### OrderComplete

- Components:
  - StatusMessage ("Payment successful")
  - OrderItem
  - SummaryRow
- Example Data: "Thanks for ordering", tracking number, shipping address
- Tags: context `shopping:complete`; entity `order` with `visible:complete` and
  `id:0rd3r1d`

---

## 📄 Pages

### ShopPage

- Story: `Shop/Pages/Shop`
- Components: Header (with CartLink), PromotionHero, Recommendations,
  ProductDetail, Checkout, OrderComplete, Footer, ConsentBar in OnePager
- Anchors: `#promotion`, `#recommendations`, `#product`, `#checkout`, `#order`

---

# Media

Every section reads its content from `src/demos/media/data.ts`.

## ⚙️ Molecules

### BannerText

- Headline: "Life in Code"
- Subtitle: "Balancing Passion and Work"

### CarouselItem

- Titles:
  - "Debugging Dreams"
  - "Code Wars"
  - "Return of the Bug"
- Tags: entity `content` with `visible` and `click`, `title` and `position`

### SearchButton

- An icon button labelled "Search"

### TaggedButton

- Texts: "Explore Now", "Activate Now"
- Tags: the button's `type` and action, context `component:TaggedButton`

---

## 🧩 Organisms

### HeroBanner

- Components:
  - Image (Banner)
  - BannerText
  - TaggedButton
- Example Data:
  - Title: "Life in Code"
  - Subtitle: "Balancing Passion and Work"
  - Button Text: "Explore Now"

### CarouselSection

- Components:
  - Heading (title)
  - CarouselItem
- Section Titles: "Our Top Series", "Movie Recommendations"
- Tags: context `list:<title>`, in English whatever the page shows

### PromotionBanner

- Components:
  - BannerText
  - TaggedButton
- Example Data:
  - Headline: "Activate Kids Mode"
  - Subtitle: "Create a safe space for younger viewers."
  - Button Text: "Activate Now"

---

## 📄 Pages

### MediaPage

- Story: `Media/Pages/Media`
- Components: Header (with the logo and SearchButton), HeroBanner,
  CarouselSection rows, PromotionBanner, an "Add row" button, Footer, ConsentBar
  in OnePager
- Anchors: `#hero`, `#series`, `#films`, `#promotion`, `#documentaries`

# Next steps

- remove ard brand
