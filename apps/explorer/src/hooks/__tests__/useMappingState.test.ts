import { renderHook, act } from '@testing-library/react';
import { useMappingState } from '../useMappingState';
import type { Mapping } from '@walkeros/core';

describe('useMappingState', () => {
  const initialMapping: Mapping.Config = {
    product: {
      view: { name: 'view_item' },
      add: { name: 'add_to_cart' },
    },
    order: {
      complete: {
        name: 'purchase',
        data: {
          map: {
            order_id: 'data.id',
          },
        },
      },
    },
  };

  it('initializes with provided config', () => {
    const { result } = renderHook(() => useMappingState(initialMapping));

    expect(result.current.config).toEqual(initialMapping);
  });

  describe('getValue', () => {
    it('gets value at path', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      const rule = result.current.actions.getValue(['product', 'view']);
      expect(rule).toEqual({ name: 'view_item' });
    });

    it('gets nested value', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      const mapValue = result.current.actions.getValue([
        'order',
        'complete',
        'data',
        'map',
      ]);
      expect(mapValue).toEqual({ order_id: 'data.id' });
    });

    it('returns undefined for non-existent path', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      const value = result.current.actions.getValue(['missing', 'rule']);
      expect(value).toBeUndefined();
    });
  });

  describe('setValue', () => {
    it('sets value at path immutably', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      act(() => {
        result.current.actions.setValue(
          ['product', 'view', 'name'],
          'product_view',
        );
      });

      expect(result.current.config.product.view).toEqual({
        name: 'product_view',
      });
    });

    it('creates nested paths', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      act(() => {
        result.current.actions.setValue(
          ['product', 'view', 'data', 'map', 'items'],
          'value',
        );
      });

      expect(
        result.current.actions.getValue([
          'product',
          'view',
          'data',
          'map',
          'items',
        ]),
      ).toBe('value');
    });

    it('triggers onChange callback', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() =>
        useMappingState(initialMapping, onChange),
      );

      act(() => {
        result.current.actions.setValue(['product', 'view', 'batch'], 1000);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          product: expect.objectContaining({
            view: expect.objectContaining({ batch: 1000 }),
          }),
        }),
      );
    });
  });

  describe('deleteValue', () => {
    it('deletes value at path', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      act(() => {
        result.current.actions.deleteValue(['product', 'view', 'name']);
      });

      expect(result.current.config.product.view).toEqual({});
    });

    it('triggers onChange callback', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() =>
        useMappingState(initialMapping, onChange),
      );

      act(() => {
        result.current.actions.deleteValue(['product', 'view', 'name']);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRuleList', () => {
    it('returns list of all rules', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      const rules = result.current.actions.getRuleList();

      expect(rules).toEqual(['order complete', 'product add', 'product view']);
    });

    it('returns empty array for empty config', () => {
      const { result } = renderHook(() => useMappingState({}));

      const rules = result.current.actions.getRuleList();

      expect(rules).toEqual([]);
    });
  });

  describe('getRule', () => {
    it('gets rule configuration', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      const rule = result.current.actions.getRule('product', 'view');

      expect(rule).toEqual({ name: 'view_item' });
    });

    it('returns undefined for non-existent rule', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      const rule = result.current.actions.getRule('missing', 'rule');

      expect(rule).toBeUndefined();
    });
  });

  describe('createRule', () => {
    it('creates new rule with default config', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      act(() => {
        result.current.actions.createRule('user', 'login');
      });

      expect(result.current.config.user).toEqual({
        login: { name: 'user_login' },
      });
    });

    it('creates new rule with custom config', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      act(() => {
        result.current.actions.createRule('user', 'login', {
          name: 'custom_name',
          batch: 500,
        });
      });

      expect(result.current.config.user).toEqual({
        login: { name: 'custom_name', batch: 500 },
      });
    });

    it('does not overwrite existing rule', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      act(() => {
        result.current.actions.createRule('product', 'view');
      });

      expect(result.current.config.product.view).toEqual({
        name: 'view_item',
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Rule "product view" already exists',
      );

      consoleSpy.mockRestore();
    });

    it('triggers onChange callback', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() =>
        useMappingState(initialMapping, onChange),
      );

      act(() => {
        result.current.actions.createRule('user', 'login');
      });

      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteRule', () => {
    it('deletes rule', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      act(() => {
        result.current.actions.deleteRule('product', 'view');
      });

      expect(result.current.config.product).toEqual({
        add: { name: 'add_to_cart' },
      });
    });

    it('removes entity when last rule is deleted', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      act(() => {
        result.current.actions.deleteRule('order', 'complete');
      });

      expect(result.current.config.order).toBeUndefined();
    });

    it('triggers onChange callback', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() =>
        useMappingState(initialMapping, onChange),
      );

      act(() => {
        result.current.actions.deleteRule('product', 'view');
      });

      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('replaceConfig', () => {
    it('replaces entire config', () => {
      const { result } = renderHook(() => useMappingState(initialMapping));

      const newConfig: Mapping.Config = {
        user: {
          login: { name: 'user_login' },
        },
      };

      act(() => {
        result.current.actions.replaceConfig(newConfig);
      });

      expect(result.current.config).toEqual(newConfig);
    });

    it('triggers onChange callback', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() =>
        useMappingState(initialMapping, onChange),
      );

      const newConfig: Mapping.Config = {
        user: {
          login: { name: 'user_login' },
        },
      };

      act(() => {
        result.current.actions.replaceConfig(newConfig);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(newConfig);
    });
  });

  describe('onChange callback', () => {
    it('does not trigger onChange in loop', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() =>
        useMappingState(initialMapping, onChange),
      );

      // Simulate multiple rapid updates
      act(() => {
        result.current.actions.setValue(['product', 'view', 'batch'], 100);
        result.current.actions.setValue(['product', 'view', 'batch'], 200);
        result.current.actions.setValue(['product', 'view', 'batch'], 300);
      });

      // Each setValue should trigger onChange once
      expect(onChange).toHaveBeenCalledTimes(3);
    });
  });
});
