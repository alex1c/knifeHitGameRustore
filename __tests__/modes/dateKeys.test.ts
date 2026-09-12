/**
 * Date-key helpers — DST-safe consecutive calendar days.
 */

import {
	compareDateKeys,
	createSeededRng,
	hashStringToSeed,
	isConsecutiveDate,
	isValidDateKey,
	previousDateKey,
	toLocalDateKey,
	todayLocalDateKey,
} from '../../src/modes/dateKeys'

describe('date keys', () => {
	it('formats local YYYY-MM-DD', () => {
		expect(toLocalDateKey(new Date(2026, 8, 12))).toBe('2026-09-12')
	})

	it('todayLocalDateKey matches toLocalDateKey(now)', () => {
		const now = new Date(2026, 0, 5, 23, 59, 0)
		expect(todayLocalDateKey(now)).toBe(toLocalDateKey(now))
	})

	it('validates real calendar dates only', () => {
		expect(isValidDateKey('2026-09-12')).toBe(true)
		expect(isValidDateKey('2026-02-30')).toBe(false)
		expect(isValidDateKey('not-a-date')).toBe(false)
		expect(isValidDateKey(null)).toBe(false)
	})

	it('previousDateKey crosses month boundaries', () => {
		expect(previousDateKey('2026-03-01')).toBe('2026-02-28')
		expect(previousDateKey('bad')).toBeNull()
	})

	it('isConsecutiveDate uses calendar keys not 24h deltas', () => {
		expect(isConsecutiveDate('2026-03-07', '2026-03-08')).toBe(true)
		expect(isConsecutiveDate('2026-03-07', '2026-03-09')).toBe(false)
		expect(isConsecutiveDate('2026-03-08', '2026-03-07')).toBe(false)
	})

	it('compareDateKeys orders lexicographically', () => {
		expect(compareDateKeys('2026-01-01', '2026-01-02')).toBeLessThan(0)
		expect(compareDateKeys('2026-01-02', '2026-01-02')).toBe(0)
		expect(compareDateKeys('2026-02-01', '2026-01-31')).toBeGreaterThan(0)
	})

	it('hashStringToSeed is stable', () => {
		expect(hashStringToSeed('2026-09-12')).toBe(hashStringToSeed('2026-09-12'))
		expect(hashStringToSeed('2026-09-12')).not.toBe(hashStringToSeed('2026-09-13'))
	})

	it('createSeededRng is deterministic', () => {
		const a = createSeededRng(42)
		const b = createSeededRng(42)
		expect([a(), a(), a()]).toEqual([b(), b(), b()])
	})
})
