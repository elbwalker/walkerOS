import { renderHook, act } from '@testing-library/react';
import { useMappingNavigation } from '../useMappingNavigation';

describe('useMappingNavigation', () => {
  it('initializes with no open tabs', () => {
    const { result } = renderHook(() => useMappingNavigation());

    expect(result.current.openTabs).toEqual([]);
    expect(result.current.activeTabId).toBe('');
    expect(result.current.treeVisible).toBe(false);
  });

  describe('openTab', () => {
    it('opens new tab and sets it as active', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view'], 'rule');
      });

      expect(result.current.openTabs).toHaveLength(1);
      expect(result.current.openTabs[0]).toMatchObject({
        id: 'product.view',
        path: ['product', 'view'],
        nodeType: 'rule',
        label: 'product view',
      });
      expect(result.current.activeTabId).toBe('product.view');
    });

    it('switches to existing tab instead of creating duplicate', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view'], 'rule');
        result.current.openTab(['order', 'complete'], 'rule');
        result.current.openTab(['product', 'view'], 'rule'); // Try to open again
      });

      expect(result.current.openTabs).toHaveLength(2);
      expect(result.current.activeTabId).toBe('product.view');
    });

    it('generates correct labels for nested paths', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view', 'data'], 'valueConfig');
      });

      expect(result.current.openTabs[0].label).toBe('Data');
    });

    it('capitalizes labels', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(
          ['product', 'view', 'data', 'map'],
          'valueConfig',
        );
      });

      expect(result.current.openTabs[0].label).toBe('Map');
    });
  });

  describe('switchToTab', () => {
    it('switches active tab', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view'], 'rule');
        result.current.openTab(['order', 'complete'], 'rule');
        result.current.switchToTab('product.view');
      });

      expect(result.current.activeTabId).toBe('product.view');
    });
  });

  describe('closeTab', () => {
    it('closes specific tab', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view'], 'rule');
        result.current.openTab(['order', 'complete'], 'rule');
        result.current.closeTab('product.view');
      });

      expect(result.current.openTabs).toHaveLength(1);
      expect(result.current.openTabs[0].id).toBe('order.complete');
    });

    it('removes tab when closing', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view'], 'rule');
        result.current.openTab(['order', 'complete'], 'rule');
      });

      expect(result.current.openTabs).toHaveLength(2);

      act(() => {
        result.current.closeTab('order.complete');
      });

      expect(result.current.openTabs).toHaveLength(1);
      expect(result.current.openTabs[0].id).toBe('product.view');
    });

    it('clears active tab ID when closing last tab', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view'], 'rule');
        result.current.closeTab('product.view');
      });

      expect(result.current.openTabs).toHaveLength(0);
      expect(result.current.activeTabId).toBe('');
    });
  });

  describe('closeLevel', () => {
    it('closes current tab', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view'], 'rule');
        result.current.openTab(['product', 'view', 'data'], 'valueConfig');
      });

      expect(result.current.openTabs).toHaveLength(2);

      act(() => {
        result.current.closeLevel();
      });

      // Should close the active tab
      expect(result.current.openTabs.length).toBeLessThan(2);
    });

    it('does nothing when no active tab', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.closeLevel();
      });

      expect(result.current.openTabs).toHaveLength(0);
    });
  });

  describe('closeAllTabs', () => {
    it('closes all tabs', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view'], 'rule');
        result.current.openTab(['order', 'complete'], 'rule');
        result.current.closeAllTabs();
      });

      expect(result.current.openTabs).toHaveLength(0);
      expect(result.current.activeTabId).toBe('');
    });
  });

  describe('getBreadcrumb', () => {
    it('returns root breadcrumb when no active tab', () => {
      const { result } = renderHook(() => useMappingNavigation());

      expect(result.current.breadcrumb).toEqual([
        { label: 'Root', path: [], nodeType: 'root' },
      ]);
    });

    it('generates breadcrumb for active tab', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(
          ['product', 'view', 'data', 'map'],
          'valueConfig',
        );
      });

      expect(result.current.breadcrumb).toEqual([
        { label: 'Root', path: [], nodeType: 'root' },
        { label: 'product view', path: ['product', 'view'], nodeType: 'rule' },
        {
          label: 'Data',
          path: ['product', 'view', 'data'],
          nodeType: 'property',
        },
        {
          label: 'Map',
          path: ['product', 'view', 'data', 'map'],
          nodeType: 'nested',
        },
      ]);
    });
  });

  describe('navigateToBreadcrumb', () => {
    it('opens tab for breadcrumb segment', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(
          ['product', 'view', 'data', 'map'],
          'valueConfig',
        );
        result.current.navigateToBreadcrumb(['product', 'view', 'data']);
      });

      expect(result.current.activeTabId).toBe('product.view.data');
    });

    it('closes all tabs when navigating to root', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view'], 'rule');
        result.current.navigateToBreadcrumb([]);
      });

      expect(result.current.openTabs).toHaveLength(0);
      expect(result.current.activeTabId).toBe('');
    });
  });

  describe('toggleTree', () => {
    it('toggles tree visibility', () => {
      const { result } = renderHook(() => useMappingNavigation());

      expect(result.current.treeVisible).toBe(false);

      act(() => {
        result.current.toggleTree();
      });

      expect(result.current.treeVisible).toBe(true);

      act(() => {
        result.current.toggleTree();
      });

      expect(result.current.treeVisible).toBe(false);
    });
  });

  describe('setTreeVisible', () => {
    it('sets tree visibility directly', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.setTreeVisible(true);
      });

      expect(result.current.treeVisible).toBe(true);

      act(() => {
        result.current.setTreeVisible(false);
      });

      expect(result.current.treeVisible).toBe(false);
    });
  });

  describe('hasTab', () => {
    it('checks if tab exists', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view'], 'rule');
      });

      expect(result.current.hasTab(['product', 'view'])).toBe(true);
      expect(result.current.hasTab(['order', 'complete'])).toBe(false);
    });
  });

  describe('findTab', () => {
    it('finds tab by ID', () => {
      const { result } = renderHook(() => useMappingNavigation());

      act(() => {
        result.current.openTab(['product', 'view'], 'rule');
      });

      const tab = result.current.findTab('product.view');

      expect(tab).toMatchObject({
        id: 'product.view',
        path: ['product', 'view'],
        nodeType: 'rule',
      });
    });

    it('returns undefined for non-existent tab', () => {
      const { result } = renderHook(() => useMappingNavigation());

      const tab = result.current.findTab('missing');

      expect(tab).toBeUndefined();
    });
  });
});
