import { isValidDateRange, isDateInPast, calculateLeaveDays, isDateRangeOverlapping, hasOverlappingRequests } from './date-validation';

describe('Date Validation Helpers', () => {
  const referenceToday = new Date('2026-10-15T12:00:00Z');

  describe('isValidDateRange', () => {
    it('should return true when end date is after start date', () => {
      expect(isValidDateRange('2026-10-15', '2026-10-20')).toBe(true);
    });

    it('should return true for single-day leave (start date equals end date)', () => {
      expect(isValidDateRange('2026-10-15', '2026-10-15')).toBe(true);
    });

    it('should return false when end date is before start date (reversed dates)', () => {
      expect(isValidDateRange('2026-10-20', '2026-10-15')).toBe(false);
    });

    it('should throw an error for malformed date inputs', () => {
      expect(() => isValidDateRange('invalid-date', '2026-10-20')).toThrow(
        'Invalid date provided',
      );
    });
  });

  describe('isDateInPast', () => {
    it('should return true for dates in the past', () => {
      expect(isDateInPast('2026-10-14', referenceToday)).toBe(true);
      expect(isDateInPast('2026-01-01', referenceToday)).toBe(true);
    });

    it('should return false for today', () => {
      expect(isDateInPast('2026-10-15', referenceToday)).toBe(false);
    });

    it('should return false for future dates', () => {
      expect(isDateInPast('2026-10-16', referenceToday)).toBe(false);
      expect(isDateInPast('2027-01-01', referenceToday)).toBe(false);
    });
  });

  describe('calculateLeaveDays', () => {
    it('should return 1 day for a single calendar day request', () => {
      expect(calculateLeaveDays('2026-10-15', '2026-10-15')).toBe(1);
    });

    it('should calculate inclusive calendar days correctly', () => {
      // Oct 15, Oct 16, Oct 17 = 3 days
      expect(calculateLeaveDays('2026-10-15', '2026-10-17')).toBe(3);
      // Oct 10 to Oct 16 = 7 days
      expect(calculateLeaveDays('2026-10-10', '2026-10-16')).toBe(7);
    });

    it('should return 0 when start date is after end date', () => {
      expect(calculateLeaveDays('2026-10-20', '2026-10-15')).toBe(0);
    });
  });

  describe('isDateRangeOverlapping', () => {
    it('should return true for identical date ranges', () => {
      const rangeA = { startDate: '2026-10-10', endDate: '2026-10-15' };
      const rangeB = { startDate: '2026-10-10', endDate: '2026-10-15' };
      expect(isDateRangeOverlapping(rangeA, rangeB)).toBe(true);
    });

    it('should return true for partial overlap (range B starts inside range A)', () => {
      const rangeA = { startDate: '2026-10-10', endDate: '2026-10-15' };
      const rangeB = { startDate: '2026-10-14', endDate: '2026-10-20' };
      expect(isDateRangeOverlapping(rangeA, rangeB)).toBe(true);
    });

    it('should return true for partial overlap (range B ends inside range A)', () => {
      const rangeA = { startDate: '2026-10-10', endDate: '2026-10-15' };
      const rangeB = { startDate: '2026-10-05', endDate: '2026-10-11' };
      expect(isDateRangeOverlapping(rangeA, rangeB)).toBe(true);
    });

    it('should return true when range B is completely within range A', () => {
      const rangeA = { startDate: '2026-10-10', endDate: '2026-10-20' };
      const rangeB = { startDate: '2026-10-12', endDate: '2026-10-15' };
      expect(isDateRangeOverlapping(rangeA, rangeB)).toBe(true);
    });

    it('should return false for adjacent date ranges (no day overlap)', () => {
      const rangeA = { startDate: '2026-10-10', endDate: '2026-10-12' };
      const rangeB = { startDate: '2026-10-13', endDate: '2026-10-15' };
      expect(isDateRangeOverlapping(rangeA, rangeB)).toBe(false);
      expect(isDateRangeOverlapping(rangeB, rangeA)).toBe(false);
    });

    it('should return false for non-overlapping separate date ranges', () => {
      const rangeA = { startDate: '2026-10-01', endDate: '2026-10-05' };
      const rangeB = { startDate: '2026-10-15', endDate: '2026-10-20' };
      expect(isDateRangeOverlapping(rangeA, rangeB)).toBe(false);
    });
  });

  describe('hasOverlappingRequests', () => {
    const existingRequests = [
      { startDate: '2026-10-10', endDate: '2026-10-12', status: 'PENDING' },
      { startDate: '2026-10-20', endDate: '2026-10-22', status: 'APPROVED' },
      { startDate: '2026-10-25', endDate: '2026-10-28', status: 'REJECTED' },
    ];

    it('should detect overlap with a PENDING request', () => {
      const newRange = { startDate: '2026-10-11', endDate: '2026-10-14' };
      expect(hasOverlappingRequests(newRange, existingRequests)).toBe(true);
    });

    it('should detect overlap with an APPROVED request', () => {
      const newRange = { startDate: '2026-10-19', endDate: '2026-10-21' };
      expect(hasOverlappingRequests(newRange, existingRequests)).toBe(true);
    });

    it('should NOT block dates that only overlap with REJECTED requests', () => {
      const newRange = { startDate: '2026-10-26', endDate: '2026-10-27' };
      expect(hasOverlappingRequests(newRange, existingRequests)).toBe(false);
    });

    it('should allow completely non-overlapping dates', () => {
      const newRange = { startDate: '2026-10-14', endDate: '2026-10-18' };
      expect(hasOverlappingRequests(newRange, existingRequests)).toBe(false);
    });
  });
});
