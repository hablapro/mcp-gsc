import { describe, it, expect } from 'vitest';
import {
  calculatePercentageChange,
  formatChange,
  formatDate,
  getDateRange,
  getExpectedCTR
} from './gscHelper';

describe('gscHelper utility functions', () => {
  describe('calculatePercentageChange', () => {
    it('should calculate positive percentage change correctly', () => {
      expect(calculatePercentageChange(100, 150)).toBe(50);
      expect(calculatePercentageChange(200, 300)).toBe(50);
    });

    it('should calculate negative percentage change correctly', () => {
      expect(calculatePercentageChange(100, 50)).toBe(-50);
      expect(calculatePercentageChange(100, 75)).toBe(-25);
    });

    it('should return 100 when before is 0 and after is positive', () => {
      expect(calculatePercentageChange(0, 100)).toBe(100);
      expect(calculatePercentageChange(0, 50)).toBe(100);
    });

    it('should return 0 when both before and after are 0', () => {
      expect(calculatePercentageChange(0, 0)).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(calculatePercentageChange(10, 15)).toBe(50);
      expect(calculatePercentageChange(0.5, 1)).toBe(100);
    });
  });

  describe('formatChange', () => {
    it('should add plus sign for positive values', () => {
      expect(formatChange(25)).toBe('+25.0');
      expect(formatChange(100.5)).toBe('+100.5');
    });

    it('should not add plus sign for negative values', () => {
      expect(formatChange(-25)).toBe('-25.0');
      expect(formatChange(-100.5)).toBe('-100.5');
    });

    it('should add plus sign for zero', () => {
      expect(formatChange(0)).toBe('+0.0');
    });

    it('should respect decimals parameter', () => {
      expect(formatChange(25.123, 2)).toBe('+25.12');
      expect(formatChange(-25.123, 0)).toBe('-25');
      expect(formatChange(25.5, 3)).toBe('+25.500');
    });
  });

  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2025-12-30T12:00:00Z');
      expect(formatDate(date)).toBe('2025-12-30');
    });

    it('should handle single digit months and days with padding', () => {
      const date = new Date('2025-01-05T12:00:00Z');
      expect(formatDate(date)).toBe('2025-01-05');
    });

    it('should handle end of year dates', () => {
      const date = new Date('2025-12-31T23:59:59Z');
      expect(formatDate(date)).toBe('2025-12-31');
    });
  });

  describe('getDateRange', () => {
    it('should return correct date range for given days', () => {
      const result = getDateRange(7);
      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();

      const start = new Date(result.startDate);
      const end = new Date(result.endDate);
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it('should return dates in YYYY-MM-DD format', () => {
      const result = getDateRange(28);
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle 1 day range', () => {
      const result = getDateRange(1);
      const start = new Date(result.startDate);
      const end = new Date(result.endDate);
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(1);
    });

    it('should handle maximum 540 days range', () => {
      const result = getDateRange(540);
      const start = new Date(result.startDate);
      const end = new Date(result.endDate);
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(540);
    });
  });

  describe('getExpectedCTR', () => {
    it('should return 30% for position 1', () => {
      expect(getExpectedCTR(1)).toBe(0.30);
    });

    it('should return 15% for position 2', () => {
      expect(getExpectedCTR(2)).toBe(0.15);
    });

    it('should return 10% for position 3', () => {
      expect(getExpectedCTR(3)).toBe(0.10);
    });

    it('should return decreasing CTR for positions 4-10', () => {
      const ctr4 = getExpectedCTR(4);
      const ctr5 = getExpectedCTR(5);
      const ctr10 = getExpectedCTR(10);

      expect(ctr4).toBeLessThan(getExpectedCTR(3));
      expect(ctr5).toBeLessThanOrEqual(ctr4);
      expect(ctr10).toBeLessThan(ctr5);
    });

    it('should return 1% for positions 11-20', () => {
      expect(getExpectedCTR(11)).toBe(0.01);
      expect(getExpectedCTR(15)).toBe(0.01);
      expect(getExpectedCTR(20)).toBe(0.01);
    });

    it('should return 0.5% for positions beyond 20', () => {
      expect(getExpectedCTR(21)).toBe(0.005);
      expect(getExpectedCTR(50)).toBe(0.005);
      expect(getExpectedCTR(100)).toBe(0.005);
    });

    it('should handle edge cases', () => {
      expect(getExpectedCTR(0.5)).toBe(0.30); // Should treat as position 1
      expect(getExpectedCTR(1.5)).toBe(0.15); // Should treat as position 2
    });
  });
});
