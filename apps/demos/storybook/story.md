# Atomic Design Component Structure

This structure follows the atomic design methodology and provides a basis for
automatically generating component folders, files, and example content. Each
level (atom, molecule, organism) includes component names and associated example
props for use in Storybook.

Two libraries follow it: **Media**, a streaming site, and **Shop**, the static
tagging demo (`apps/demos/tagging`) as components.

---

# Media

## 🧪 Atoms

### Button

- Variants: Primary, Secondary, CTA
- Example Texts:
  - Primary: "Watch now"
  - Secondary: "Add to backlog"
  - CTA: "Discover more"

### Typography

- Types: Heading, Subtitle, Body
- Example Texts:
  - Heading: "Now Streaming"
  - Subtitle: "Recommended Series"
  - Body: "Recommended because you watched similar shows."

### Icon

- Types: Search, Profile (User)
- Example Usages:
  - Search icon for search field
  - User icon for login status

### Image

- Types: Thumbnail, Banner
- Example Titles:
  - Thumbnail Examples:
    - "Debugging Dreams"
    - "Code Wars"
    - "API Chronicles"
    - "Return of the Bug"
    - "Sleepless in Stack Overflow"
    - "The Art of Refactoring"
    - "Inside Silicon Valley"
    - "A Journey into Agile"
  - Banner Example:
    - "Life in Code"

---

## ⚙️ Molecules

### NavigationMenu

- Menu Items:
  - Movies
  - Series
  - Documentaries
  - Sports
  - Kids

### CarouselItem

- Titles:
  - "Debugging Dreams"
  - "Code Wars"
  - "API Chronicles"

### BannerText

- Headline: "Tonight’s Highlight"
- Subtitle: "Balancing Work and Passion"

### ActionButton

- Texts:
  - "Watch Now"
  - "Learn More"

---

## 🧩 Organisms

### HeaderBar

- Components:
  - Logo
  - NavigationMenu
  - Icons (Search & Profile)
- Example Data:
  - Greeting: "Hey there, welcome back!"
  - Search Placeholder: "Search..."

### HeroBanner

- Components:
  - Image (Banner)
  - BannerText
  - ActionButton
- Example Data:
  - Title: "Life in Code"
  - Subtitle: "Balancing Passion and Work"
  - Button Text: "Explore Now"

### CarouselSection

- Components:
  - Typography (title)
  - CarouselItem
- Section Title: "Recommended for You"

### PromotionBanner

- Components:
  - BannerText
  - ActionButton
- Example Data:
  - Headline: "Activate Kids Mode"
  - Subtitle: "Create a safe space for younger viewers."
  - Button Text: "Activate Now"

---

# Shop

Every component reads its content from `src/components/shop/data.ts` and its
tags carry over from the static tagging demo.

## 🧪 Atoms

### Badge

- Example Text: "Schnapper"

### Button

- Variants: Primary, Secondary, Link, Icon
- Example Texts:
  - Primary: "Confirm order"
  - Secondary: "Add to cart"
  - Link: "Continue Shopping"

### Heading

- Levels: 1 to 4, sized by a design type style
- Example Texts: "Recommendations", "Everyday Ruck Snack"

### Icon

- Types: Star, Check, Check circle, X circle, Info, Warning, Trash, Cart, Globe,
  Shield check, Slash, Facebook, Instagram, Twitter, GitHub, YouTube

### Input

- Example: email address field

### Link

- Variants: Subtle, Primary, Secondary, Link
- Example Texts: "Solutions", "Get started", "Learn more"

### Price

- Example Amounts: "€140", "€220.00", "€5.52"

### ProductImage

- An offline placeholder: a chart colour fill with the item's name
- Example Names: "Everyday Ruck Snack", "Cool Cap"

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

### Breadcrumb

- Example Items: "Travel", "Bags"
- Tags: `category:Travel/Bags` from the product detail

### CartLineItem

- Components: ProductImage, ProductFacts, Price, Select (quantity), Button
  (remove)
- Example Data: "Everyday Ruck Snack", Black, Large, €220.00
- Tags: entity `product`, `price;currency`, `quantity:#value`, remove
  `click:remove`

### ConsentControls

- Texts: "Accept", "Reset", "Decline"

### FormField

- Example Labels: "Email address", "Country"

### HeaderGlobals

- Example Data: language "EN", cart "€249"
- Tags: globals `language:en`, `cart_value:249`

### NavLinks

- Menu Items: Solutions, Pricing, Docs, Company

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

### SocialLinks

- Links: Facebook, Instagram, Twitter, GitHub, YouTube

### StatusMessage

- Tones: Success, Danger, Warning, Info, each an icon and words
- Example Texts: "In stock and ready to ship", "Status: unknown"

### SummaryRow

- Example Data: "Shipping" €5.00, "Total" €269.52
- Tags: the amount as a property of `checkout` or `order`

---

## 🧩 Organisms

### Header

- Components:
  - NavLinks
  - HeaderGlobals

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

### ShopLayout

- Slots: header, main, footer, consent bar (pinned to the bottom)

---

## 📄 Pages

### TaggingDemo

- Story: `Shop/Pages/Tagging demo`
- Components: Header, PromotionHero, Recommendations, ProductDetail, Checkout,
  OrderComplete, Footer, ConsentBar in ShopLayout
- Consent sends `walker user` and `walker consent` as the static demo does

# Next steps

- remove ard brand
