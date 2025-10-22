import { renderHook, act } from '@testing-library/react';
import { useMappingState } from '../hooks/useMappingState';
import type { Mapping } from '@walkeros/core';

/**
 * Test for the specific bug: Adding consent states at deeply nested paths
 *
 * Bug: When navigating to path ['page', 'view', 'data', 'map', 'page_location', 'consent']
 * and adding a consent state, it disappears.
 *
 * Root cause: deepClone using JSON.parse/stringify was losing data
 * Fix: Proper recursive cloning that preserves all value types
 */
describe('Consent at deep nested paths', () => {
  const initialMapping: Mapping.Config = {
    page: {
      view: {
        name: 'page_view',
        data: {
          map: {
            page_location: {
              key: 'data.location',
              // Initially no consent
            },
            page_title: 'data.title',
          },
        },
      },
    },
  };

  it('should preserve consent when adding states at deep path', () => {
    const { result } = renderHook(() => useMappingState(initialMapping));

    const deepPath = [
      'page',
      'view',
      'data',
      'map',
      'page_location',
      'consent',
    ];

    // Add first consent state
    act(() => {
      result.current.actions.setValue(deepPath, { marketing: true });
    });

    // Verify it was added
    let consentValue = result.current.actions.getValue(deepPath);
    expect(consentValue).toEqual({ marketing: true });

    // Add second consent state
    act(() => {
      result.current.actions.setValue(deepPath, {
        marketing: true,
        functional: true,
      });
    });

    // Verify both states are present
    consentValue = result.current.actions.getValue(deepPath);
    expect(consentValue).toEqual({
      marketing: true,
      functional: true,
    });

    // Verify the entire structure is intact
    const pageLocation = result.current.actions.getValue([
      'page',
      'view',
      'data',
      'map',
      'page_location',
    ]);
    expect(pageLocation).toEqual({
      key: 'data.location',
      consent: {
        marketing: true,
        functional: true,
      },
    });

    // Verify sibling values weren't affected
    const pageTitle = result.current.actions.getValue([
      'page',
      'view',
      'data',
      'map',
      'page_title',
    ]);
    expect(pageTitle).toBe('data.title');
  });

  it('should handle adding consent when other ValueConfig properties exist', () => {
    const { result } = renderHook(() => useMappingState(initialMapping));

    const deepPath = [
      'page',
      'view',
      'data',
      'map',
      'page_location',
      'consent',
    ];

    // First, add a validate function
    act(() => {
      result.current.actions.setValue(
        ['page', 'view', 'data', 'map', 'page_location', 'validate'],
        '(value) => value.length > 0',
      );
    });

    // Then add consent
    act(() => {
      result.current.actions.setValue(deepPath, { marketing: true });
    });

    // Verify both properties exist
    const pageLocation = result.current.actions.getValue([
      'page',
      'view',
      'data',
      'map',
      'page_location',
    ]);
    expect(pageLocation).toEqual({
      key: 'data.location',
      validate: '(value) => value.length > 0',
      consent: {
        marketing: true,
      },
    });
  });

  it('should handle removing and re-adding consent states', () => {
    const { result } = renderHook(() => useMappingState(initialMapping));

    const deepPath = [
      'page',
      'view',
      'data',
      'map',
      'page_location',
      'consent',
    ];

    // Add consent
    act(() => {
      result.current.actions.setValue(deepPath, { marketing: true });
    });

    // Remove consent
    act(() => {
      result.current.actions.deleteValue(deepPath);
    });

    // Verify consent is removed but structure intact
    let pageLocation = result.current.actions.getValue([
      'page',
      'view',
      'data',
      'map',
      'page_location',
    ]);
    expect(pageLocation).toEqual({
      key: 'data.location',
      // No consent property
    });

    // Re-add consent with different state
    act(() => {
      result.current.actions.setValue(deepPath, { functional: true });
    });

    // Verify new consent is added
    pageLocation = result.current.actions.getValue([
      'page',
      'view',
      'data',
      'map',
      'page_location',
    ]);
    expect(pageLocation).toEqual({
      key: 'data.location',
      consent: {
        functional: true,
      },
    });
  });

  it('should handle multiple nested ValueConfigs with consent', () => {
    const complexMapping: Mapping.Config = {
      order: {
        complete: {
          data: {
            map: {
              items: {
                loop: [
                  'nested',
                  {
                    map: {
                      item_id: {
                        key: 'data.id',
                        consent: { marketing: true },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    };

    const { result } = renderHook(() => useMappingState(complexMapping));

    // Navigate to deeply nested consent
    const deepPath = [
      'order',
      'complete',
      'data',
      'map',
      'items',
      'loop',
      '1',
      'map',
      'item_id',
      'consent',
    ];

    // Get existing consent
    const existingConsent = result.current.actions.getValue(deepPath);
    expect(existingConsent).toEqual({ marketing: true });

    // Add another consent state
    act(() => {
      result.current.actions.setValue(deepPath, {
        marketing: true,
        functional: true,
      });
    });

    // Verify it was added
    const updatedConsent = result.current.actions.getValue(deepPath);
    expect(updatedConsent).toEqual({
      marketing: true,
      functional: true,
    });

    // Verify entire structure is preserved
    const itemId = result.current.actions.getValue([
      'order',
      'complete',
      'data',
      'map',
      'items',
      'loop',
      '1',
      'map',
      'item_id',
    ]);
    expect(itemId).toEqual({
      key: 'data.id',
      consent: {
        marketing: true,
        functional: true,
      },
    });
  });
});
