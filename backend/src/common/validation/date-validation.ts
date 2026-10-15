export interface DateRange {
  startDate: Date | string;
  endDate: Date | string;
}

export interface ExistingRequestDateRange extends DateRange {
  status: string;
}

/**
 * Normalizes a date to start of day (00:00:00.000) for consistent calendar comparison.
 */
export function normalizeToStartOfDay(dateInput: Date | string): Date {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided');
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Validates that the end date is on or after the start date.
 */
export function isValidDateRange(startDate: Date | string, endDate: Date | string): boolean {
  const start = normalizeToStartOfDay(startDate);
  const end = normalizeToStartOfDay(endDate);
  return end.getTime() >= start.getTime();
}

/**
 * Checks whether a given date is in the past relative to reference date (defaults to today).
 * Compares by calendar date (start of day).
 */
export function isDateInPast(date: Date | string, referenceDate: Date = new Date()): boolean {
  const target = normalizeToStartOfDay(date);
  const reference = normalizeToStartOfDay(referenceDate);
  return target.getTime() < reference.getTime();
}

/**
 * Calculates the total inclusive calendar days between two dates.
 * e.g., Oct 15 to Oct 15 = 1 day; Oct 15 to Oct 17 = 3 days.
 * Returns 0 if end date is prior to start date.
 */
export function calculateLeaveDays(startDate: Date | string, endDate: Date | string): number {
  if (!isValidDateRange(startDate, endDate)) {
    return 0;
  }
  const start = normalizeToStartOfDay(startDate);
  const end = normalizeToStartOfDay(endDate);

  const diffMs = end.getTime() - start.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  return Math.round(diffMs / dayMs) + 1;
}

/**
 * Checks if two date ranges overlap.
 * Adjacent ranges (e.g. Range A: Oct 10-12 and Range B: Oct 13-15) do NOT overlap.
 */
export function isDateRangeOverlapping(rangeA: DateRange, rangeB: DateRange): boolean {
  const startA = normalizeToStartOfDay(rangeA.startDate).getTime();
  const endA = normalizeToStartOfDay(rangeA.endDate).getTime();
  const startB = normalizeToStartOfDay(rangeB.startDate).getTime();
  const endB = normalizeToStartOfDay(rangeB.endDate).getTime();

  return startA <= endB && endA >= startB;
}

/**
 * Checks if a requested date range overlaps with any existing request
 * that has status 'PENDING' or 'APPROVED'.
 */
export function hasOverlappingRequests(
  newRange: DateRange,
  existingRequests: ExistingRequestDateRange[],
): boolean {
  return existingRequests.some((existing) => {
    const isBlockingStatus =
      existing.status === 'PENDING' || existing.status === 'APPROVED';
    if (!isBlockingStatus) {
      return false;
    }
    return isDateRangeOverlapping(newRange, existing);
  });
}
