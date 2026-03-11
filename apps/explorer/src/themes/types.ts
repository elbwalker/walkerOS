/**
 * TypeScript type definitions for walkerOS Explorer themes
 *
 * These types provide type-safe access to theme properties and enable
 * programmatic theme customization.
 */

export interface ExplorerTheme {
  mode: 'light' | 'dark';

  colors: {
    // Text colors
    text: string;
    textLabel: string;
    textButton: string;
    textButtonHover: string;
    textButtonActive: string;
    textMuted: string;
    textToggle: string;
    textInput: string;
    textPlaceholder: string;

    // Background colors
    bgBox: string;
    bgHeader: string;
    bgFooter: string;
    bgButtonHover: string;
    bgButtonActive: string;
    bgButtonGroup: string;
    bgInput: string;
    bgInputHover: string;
    bgCodeInline: string;
    bgDropdown: string;
    bgDropdownOptionHover: string;
    bgDropdownOptionHighlighted: string;

    // Border colors
    borderBox: string;
    borderHeader: string;
    borderFooter: string;
    borderButtonGroup: string;
    borderInput: string;
    borderInputFocus: string;

    // Button colors
    buttonPrimary: string;
    buttonPrimaryHover: string;
    buttonPrimaryText: string;
    buttonDanger: string;
    buttonDangerHover: string;
    buttonDangerText: string;

    // Status colors
    statusEnabled: string;
    statusDisabled: string;
    statusWarning: string;

    // Highlight colors
    highlightPrimary: string;
    highlightGlobals: string;
    highlightContext: string;
    highlightEntity: string;
    highlightProperty: string;
    highlightAction: string;
    highlightBackground: string;
    highlightText: string;
    highlightHover: string;
    highlightSeparator: string;
  };

  typography: {
    fontFamily: string;
    fontMono: string;
    fontSize: {
      base: string;
      label: string;
      toggle: string;
      highlightButton: string;
    };
    fontWeight: {
      normal: number;
      semibold: number;
    };
    lineHeight: {
      base: number;
    };
  };

  spacing: {
    header: string;
    footer: string;
    button: string;
    buttonGroup: string;
    gridGap: string;
  };

  radius: {
    box: string;
    button: string;
    buttonGroup: string;
    highlightButton: string;
  };

  shadows: {
    buttonActive: string;
    dropdown: string;
  };

  grid: {
    minBoxWidth: string;
    rowMinHeight: string;
    rowMaxHeight: string;
    boxMaxHeightMobile: string;
  };

  monaco: {
    theme: string;
    fontSize: string;
    lineHeight: string;
  };
}
