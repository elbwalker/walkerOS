import type { SheetsStoreSettings } from '../types';
import {
  buildAppendRange,
  buildCellRange,
  buildColumnRange,
  buildHeaderRange,
  columnLetter,
  encodeSheet,
  parseRowFromRange,
  resolveHeaderRows,
  resolveKeyColumn,
  resolveSheet,
  resolveValueColumn,
} from '../setup-helpers';

const minimal: SheetsStoreSettings = { id: 'sheet-id' };

describe('setup-helpers', () => {
  describe('resolveSheet', () => {
    it('defaults to "Sheet1" when settings omit sheet', () => {
      expect(resolveSheet(minimal)).toBe('Sheet1');
    });

    it('returns the configured sheet name', () => {
      expect(resolveSheet({ ...minimal, sheet: 'Customers' })).toBe(
        'Customers',
      );
    });
  });

  describe('resolveKeyColumn', () => {
    it('defaults to "A"', () => {
      expect(resolveKeyColumn(minimal)).toBe('A');
    });

    it('upper-cases lowercase input', () => {
      expect(resolveKeyColumn({ ...minimal, key: 'a' })).toBe('A');
    });
  });

  describe('resolveValueColumn', () => {
    it('defaults to "B"', () => {
      expect(resolveValueColumn(minimal)).toBe('B');
    });

    it('upper-cases lowercase input', () => {
      expect(resolveValueColumn({ ...minimal, value: 'd' })).toBe('D');
    });
  });

  describe('resolveHeaderRows', () => {
    it('defaults to 1', () => {
      expect(resolveHeaderRows(minimal)).toBe(1);
    });

    it('returns the configured number', () => {
      expect(resolveHeaderRows({ ...minimal, headerRows: 3 })).toBe(3);
    });

    it('honors zero', () => {
      expect(resolveHeaderRows({ ...minimal, headerRows: 0 })).toBe(0);
    });
  });

  describe('buildColumnRange', () => {
    it('builds an open-ended column range', () => {
      expect(buildColumnRange('Sheet1', 'A', 2)).toBe('Sheet1!A2:A');
    });

    it('quotes sheet names with spaces', () => {
      expect(buildColumnRange('My Sheet', 'A', 2)).toBe("'My Sheet'!A2:A");
    });
  });

  describe('buildCellRange', () => {
    it('builds a single-cell range', () => {
      expect(buildCellRange('Sheet1', 'B', 5)).toBe('Sheet1!B5');
    });
  });

  describe('buildHeaderRange', () => {
    it('builds a header range across N columns', () => {
      expect(buildHeaderRange('Sheet1', 3)).toBe('Sheet1!A1:C1');
    });
  });

  describe('buildAppendRange', () => {
    it('builds a range across the key and value columns', () => {
      expect(buildAppendRange('Sheet1', 'A', 'B')).toBe('Sheet1!A:B');
    });
  });

  describe('columnLetter', () => {
    it('maps 1 -> A, 26 -> Z, 27 -> AA, 52 -> AZ', () => {
      expect(columnLetter(1)).toBe('A');
      expect(columnLetter(26)).toBe('Z');
      expect(columnLetter(27)).toBe('AA');
      expect(columnLetter(52)).toBe('AZ');
    });

    it('throws for indexes below 1', () => {
      expect(() => columnLetter(0)).toThrow(/index must be >=1/);
    });
  });

  describe('encodeSheet', () => {
    it('returns plain names unchanged', () => {
      expect(encodeSheet('Sheet1')).toBe('Sheet1');
    });

    it('wraps names with spaces in single quotes', () => {
      expect(encodeSheet('My Sheet')).toBe("'My Sheet'");
    });

    it('doubles single quotes inside the name', () => {
      expect(encodeSheet("Bob's Data")).toBe("'Bob''s Data'");
    });
  });

  describe('parseRowFromRange', () => {
    it('extracts the first row number from a Sheets range', () => {
      expect(parseRowFromRange('Sheet1!A5:B5')).toBe(5);
    });

    it('handles quoted sheet names with spaces', () => {
      expect(parseRowFromRange("'My Sheet'!A12:B12")).toBe(12);
    });

    it('returns undefined when no row is present', () => {
      expect(parseRowFromRange('not-a-range')).toBeUndefined();
    });
  });
});
