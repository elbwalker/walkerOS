# Atomic Design Component Structure

This structure follows the atomic design methodology and provides a basis for
automatically generating component folders, files, and example content. Each
level (atom, molecule, organism) includes component names and associated example
props for use in Storybook.

---

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

# Next steps

- remove ard brand
