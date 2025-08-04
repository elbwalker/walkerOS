# walkerOS Storybook Demo

A comprehensive Storybook demo showcasing **walkerOS event tracking
integration** with React components. This demo demonstrates how to use the
`@walkeros/storybook-addon` to visualize and debug data collection events in
your component library.

## 🚀 Features

- **walkerOS Integration**: Complete integration with
  `@walkeros/storybook-addon` for event tracking visualization
- **Atomic Design Structure**: Components organized as Atoms → Molecules →
  Organisms → Templates
- **Event Visualization**: Real-time walkerOS event detection and display
- **TypeScript Support**: Full type safety across all components
- **Responsive Design**: Mobile-first approach with responsive layouts
- **Domain Filtering**: Toggle between e-commerce and media component domains

## 📁 Project Structure

```
src/components/
├── ecommerce/       # E-commerce domain components
│   ├── atoms/       # Basic building blocks
│   │   ├── Button/
│   │   ├── Input/
│   │   └── Typography/
│   ├── molecules/   # Simple groups of UI elements
│   │   ├── Card/
│   │   └── SearchBox/
│   ├── organisms/   # Complex UI components
│   │   ├── Header/
│   │   └── ProductGrid/
│   └── templates/   # Page-level layouts
│       └── ShopTemplate/
└── media/           # Media domain components
    ├── atoms/       # Basic media elements
    │   ├── Button/
    │   ├── Icon/
    │   └── Typography/
    ├── molecules/   # Media UI groups
    │   ├── BannerText/
    │   └── TaggedButton/
    ├── organisms/   # Complex media components
    │   ├── HeroBanner/
    │   └── PromotionBanner/
    └── templates/   # Media page layouts
        └── MediathekTemplate/
```

## 🛠️ Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm

### Quick Start - Standalone Demo ⚡

**The easiest way to see the walkerOS addon in action:**

1. **Clone the walkerOS repository**:

```bash
git clone https://github.com/elbwalker/walkerOS.git
cd walkerOS/apps/demos/storybook
```

2. **Open the standalone demo**:

```bash
# Simply open the HTML file in your browser
open storybook-standalone.html
# or serve it locally
python -m http.server 8000  # then visit http://localhost:8000/storybook-standalone.html
```

This standalone demo simulates the exact functionality of the
`@walkeros/storybook-addon` and shows:

- Real-time walkerOS event detection
- Interactive event inspection
- Configurable prefix settings
- Multiple tracking examples

### Full Storybook Setup

**To run the complete Storybook with the walkerOS addon:**

1. **Clone and setup** (from the walkerOS root):

```bash
git clone https://github.com/elbwalker/walkerOS.git
cd walkerOS
npm install
```

2. **Build the storybook addon**:

```bash
cd apps/storybook-addon
npm run build
```

3. **Launch Storybook**:

```bash
cd ../demos/storybook
npm run storybook
```

> **Note**: Due to monorepo module resolution complexities, if you encounter
> issues, use the standalone demo above which provides the same functionality.

## 🏷️ walkerOS Integration

### Event Tracking Demo

This demo showcases how walkerOS data attributes work with the Storybook addon:

#### Tagged Components

Several components include walkerOS tagging examples:

- **Tagged Button** (media domain): Demonstrates `data-elb` attributes
- **Hero Banner** (media domain): Shows entity and action tracking
- **Other components**: Various examples of walkerOS integration

#### Using the walkerOS Addon

1. **View Events**: Navigate to any story and open the "walkerOS" tab in the
   addon panel
2. **Inspect Data**: Click on detected events to see their complete data
   structure
3. **Configure**: Use the Config tab to adjust auto-refresh and prefix settings
4. **Domain Filter**: Use the toolbar to filter components by domain
   (e-commerce/media/all)

#### Example Tagging

```tsx
// Example from TaggedButton component
<button
  data-elb="promotional_button"
  data-elbaction="click"
  data-elbdata="type:cta;campaign:hero"
>
  Click me
</button>
```

## 📚 Component Structure

The demo is organized into two domains to show different use cases:

### E-commerce Domain

- **Atoms**: Button, Input, Typography
- **Molecules**: Card, SearchBox
- **Organisms**: Header, ProductGrid
- **Templates**: ShopTemplate

### Media Domain

- **Atoms**: Button, Icon, Image, Typography
- **Molecules**: BannerText, CarouselItem, TaggedButton
- **Organisms**: HeroBanner, PromotionBanner, CarouselSection
- **Templates**: MediathekTemplate

## 📖 Storybook Features

Access the demo at: `http://localhost:6006`

### Key Features:

- **walkerOS Addon Panel**: Real-time event detection and visualization
- **Domain Filtering**: Toggle between e-commerce, media, or all components
- **Interactive Controls**: Modify component props and see walkerOS events
  update
- **Event Inspector**: Detailed JSON view of detected walkerOS events
- **Auto-refresh**: Events update automatically when navigating or changing
  controls

### Navigation Tips:

1. Use the **Domain** dropdown in the toolbar to filter components
2. Check the **walkerOS** addon panel for event information
3. Try the **Config** tab to adjust addon settings
4. Look for components with "Tagged" in the name for walkerOS examples

## 🔧 Available Scripts

- `npm run storybook` - Start Storybook development server
- `npm run build-storybook` - Build static Storybook for deployment
- `npm run lint` - Run ESLint on source files

## 🎯 Learning Objectives

This demo illustrates:

1. **walkerOS Integration**: How to implement event tracking in React components
2. **Storybook Addon Usage**: Visualizing and debugging tracking events
3. **Component Tagging**: Best practices for adding walkerOS data attributes
4. **Event Validation**: Using Storybook to verify tracking implementation
5. **Domain Organization**: Structuring components by business domain

## 🔍 Exploring walkerOS Events

### What to Look For:

- **Tagged Button**: Simple button with walkerOS attributes
- **Hero Banner**: Complex component with nested event data
- **Navigation Elements**: Examples of contextual tracking
- **Interactive Components**: Events that trigger on user actions

### Event Structure:

All walkerOS events follow a consistent structure:

```json
{
  "entity": "promotional_button",
  "action": "click",
  "data": {
    "type": "cta",
    "campaign": "hero"
  },
  "context": {},
  "user": {},
  "nested": []
}
```

## 🚀 Using This Demo

### For Developers:

1. **Learn walkerOS**: See practical examples of event tracking implementation
2. **Test Components**: Use Storybook to validate tracking before deployment
3. **Debug Events**: Use the addon to troubleshoot tracking issues

### For Product Teams:

1. **Review Tracking**: Verify that events match analytics requirements
2. **Plan Events**: Use the demo to design tracking for new features
3. **Document Events**: Share Storybook links to communicate event structures

## 📚 Related Documentation

- [walkerOS Documentation](https://docs.walkeros.com)
- [@walkeros/storybook-addon](../../../storybook-addon/README.md)
- [walkerOS GitHub](https://github.com/elbwalker/walkerOS)

---

**Built with ❤️ to demonstrate walkerOS integration with Storybook.**
