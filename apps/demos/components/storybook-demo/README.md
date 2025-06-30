# Component Demo - Atomic Design with Storybook

This project demonstrates a complete implementation of **Atomic Design principles** using React, TypeScript, and Storybook. It showcases how to build scalable, reusable UI components following the [component-driven.org](https://www.componentdriven.org/) methodology.

## 🚀 Features

- **Atomic Design Structure**: Components organized as Atoms → Molecules → Organisms → Templates
- **Storybook Integration**: Interactive component documentation and testing
- **TypeScript Support**: Full type safety across all components
- **Responsive Design**: Mobile-first approach with responsive layouts
- **Modern Tooling**: Vite for fast development and building

## 📁 Project Structure

```
src/components/
├── atoms/           # Basic building blocks
│   ├── Button/
│   ├── Input/
│   └── Typography/
├── molecules/       # Simple groups of UI elements
│   ├── Card/
│   └── SearchBox/
├── organisms/       # Complex UI components
│   ├── Header/
│   └── ProductGrid/
└── templates/       # Page-level layouts
    └── ShopTemplate/
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Launch Storybook:
```bash
npm run storybook
```

## 📚 Component Hierarchy

### Atoms
- **Button**: Primary and secondary variants with different sizes
- **Input**: Form inputs with validation states and sizes
- **Typography**: Consistent text styles (headings, body, captions)

### Molecules
- **Card**: Content cards with optional images and actions
- **SearchBox**: Combined input and button for search functionality

### Organisms
- **Header**: Navigation bar with branding, search, and user actions
- **ProductGrid**: Responsive grid layout for displaying products

### Templates
- **ShopTemplate**: Complete e-commerce page layout combining all components

## 🎨 Design System

The components follow a consistent design system with:
- Unified color palette
- Consistent spacing and typography
- Responsive breakpoints
- Accessibility best practices

## 📖 Storybook

Access the interactive component library at: `http://localhost:6006`

Each component includes:
- Multiple story variants
- Interactive controls (knobs)
- Auto-generated documentation
- Accessibility testing

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run storybook` - Start Storybook
- `npm run build-storybook` - Build Storybook for deployment

## 🎯 Learning Objectives

This demo illustrates:
1. **Component Composition**: How small components combine to create complex UIs
2. **Reusability**: Components designed for maximum reuse across projects
3. **Maintainability**: Clear separation of concerns and consistent patterns
4. **Documentation**: Living documentation through Storybook
5. **Type Safety**: Leveraging TypeScript for robust component APIs

## 🌟 Component-Driven Development

This project embraces the Component-Driven Development approach:
- **Build components in isolation** using Storybook
- **Test component variations** with different props and states
- **Document component APIs** with TypeScript and stories
- **Compose complex UIs** from simple, reusable building blocks

## 📱 Responsive Design

All components are built with mobile-first responsive design:
- Flexible layouts using CSS Grid and Flex-box
- Breakpoints for tablet and desktop experiences
- Touch-friendly interactive elements

## 🚀 Deployment

The project is ready for deployment to any static hosting service:
- **Main App**: Deploy the `dist` folder after `npm run build`
- **Storybook**: Deploy the `storybook-static` folder after `npm run build-storybook`

---

**Built with ❤️ using Atomic Design principles and modern React tooling.**
