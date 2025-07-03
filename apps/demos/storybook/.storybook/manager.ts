import { addons } from 'storybook/manager-api';

addons.register('domain-filter', (api) => {
  // Track current domain
  let currentDomain = 'ecommerce';
  
  // Function to filter stories in sidebar
  const filterStories = (domain: string) => {
    // Wait for DOM to be ready
    setTimeout(() => {
      const style = document.getElementById('domain-filter-style') || document.createElement('style');
      style.id = 'domain-filter-style';
      
      if (domain === 'all') {
        // Show all stories
        style.textContent = '';
      } else {
        // Hide domain-specific stories based on the actual story IDs and titles
        const ecommerceRules = domain === 'ecommerce' ? 'flex' : 'none';
        const mediaRules = domain === 'media' ? 'flex' : 'none';
        
        style.textContent = `
          /* E-commerce components */
          [data-item-id*="ecommerce"] { display: ${ecommerceRules} !important; }
          
          /* Media components */
          [data-item-id*="media"] { display: ${mediaRules} !important; }
          
          /* Always show shared components */
          [data-item-id*="shared"] { display: flex !important; }
          [data-item-id*="introduction"] { display: flex !important; }
        `;
      }
      
      if (!document.head.contains(style)) {
        document.head.appendChild(style);
      }
    }, 100);
  };
  
  // Apply initial filter
  setTimeout(() => filterStories(currentDomain), 1000);
  
  // Listen for global changes
  api.on('globalsUpdated', ({ globals }) => {
    if (globals.domain && globals.domain !== currentDomain) {
      currentDomain = globals.domain;
      filterStories(currentDomain);
    }
  });
  
  // Re-apply filter when sidebar is rebuilt
  api.on('storiesConfigured', () => {
    setTimeout(() => filterStories(currentDomain), 500);
  });
});