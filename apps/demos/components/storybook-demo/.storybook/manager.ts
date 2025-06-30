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
          [data-item-id*="molecules-card"] { display: ${ecommerceRules} !important; }
          [data-item-id*="molecules-searchbox"] { display: ${ecommerceRules} !important; }
          [data-item-id*="organisms-productgrid"] { display: ${ecommerceRules} !important; }
          [data-item-id*="templates-shoptemplate"] { display: ${ecommerceRules} !important; }
          
          /* Media components */
          [data-item-id*="molecules-articlecard"] { display: ${mediaRules} !important; }
          [data-item-id*="molecules-categoryfilter"] { display: ${mediaRules} !important; }
          [data-item-id*="organisms-articlelist"] { display: ${mediaRules} !important; }
          [data-item-id*="templates-publisherhome"] { display: ${mediaRules} !important; }
          [data-item-id*="templates-publisherarticle"] { display: ${mediaRules} !important; }
          
          /* Always show shared components */
          [data-item-id*="atoms-"] { display: flex !important; }
          [data-item-id*="organisms-header"] { display: flex !important; }
          [data-item-id*="introduction"] { display: flex !important; }
          
          /* Also handle story items with different patterns */
          [data-item-id*="card--"] { display: ${ecommerceRules} !important; }
          [data-item-id*="searchbox--"] { display: ${ecommerceRules} !important; }
          [data-item-id*="productgrid--"] { display: ${ecommerceRules} !important; }
          [data-item-id*="shoptemplate--"] { display: ${ecommerceRules} !important; }
          
          [data-item-id*="articlecard--"] { display: ${mediaRules} !important; }
          [data-item-id*="categoryfilter--"] { display: ${mediaRules} !important; }
          [data-item-id*="articlelist--"] { display: ${mediaRules} !important; }
          [data-item-id*="publisherhome--"] { display: ${mediaRules} !important; }
          [data-item-id*="publisherarticle--"] { display: ${mediaRules} !important; }
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