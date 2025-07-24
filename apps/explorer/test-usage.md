# WalkerOS Explorer Usage Tests

## Library Usage (React Apps)

```typescript
import { Explorer } from '@walkerOS/explorer';

function App() {
  return (
    <div>
      <div data-elbexplore data-elb="product" data-elb-product="id:123">
        Product Element
      </div>

      <Explorer
        selector="[data-elbexplore]"
        showFullScreen={true}
        showCopy={true}
        showFormat={true}
      />
    </div>
  );
}
```

## Standalone Usage (Any Website)

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Explorer Test</title>
  </head>
  <body>
    <div data-elbexplore data-elb="product" data-elb-product="id:123">
      Product Element
    </div>

    <script src="explorer.js"></script>
    <script>
      document.addEventListener('DOMContentLoaded', async () => {
        const explorer = await createExplorer({
          selector: '[data-elbexplore]',
          showFullScreen: true,
          showCopy: true,
          showFormat: true,
        });
      });
    </script>
  </body>
</html>
```

## Features Available in Both Modes

✅ **Live Code Editor** - Edit HTML and see real-time changes ✅ **Advanced
Syntax Highlighting** - ELB attributes highlighted in green/blue ✅ **Copy &
Format Tools** - One-click code manipulation ✅ **Full Screen Mode** - Expanded
editing experience  
✅ **Shadow DOM Isolation** - Complete CSS isolation from host site ✅ **React
State Management** - Proper hook-based state handling ✅ **Auto-detection** -
Automatically finds and tracks new elements ✅ **Escape Key Support** - Close
modals with keyboard ✅ **Click Outside** - Close modals by clicking backdrop

## Build Outputs

- **Library**: `index.mjs`, `index.cjs` + TypeScript definitions
- **Standalone**: `explorer.js` (1.15MB with React bundled)

## Architecture Benefits

1. **Single Codebase** - No duplicate logic between React and vanilla
2. **Full Feature Parity** - Both modes have identical capabilities
3. **Test-Driven** - Same component tests work for both builds
4. **Future-Proof** - New React features automatically available in both modes
5. **Clean API** - Simple, consistent interface for both usage patterns
