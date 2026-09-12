/**
 * Daily challenge generation + streak rules.
 */

import { validateLevelConfig } from '../../src/game/config/validateLevel'
import { generateDailyChallenge } from '../../src/modes/daily'
import { applyDailyStreak } from '../../src/modes/streak'
import {
	recordDailyAttempt,
	recordDailyCompletion,
	sanitizeDaily,
	DEFAULT_DAILY,
} from '../../src/storage/dailyStore'
import { applyEndlessRunEnd, sanitizeEndless } from '../../src/storage/endlessStore'

describe('daily generation', () => {
	it('same date → same seed and config', () => {
		const a = generateDailyChallenge('2026-09-12')
		const b = generateDailyChallenge('2026-09-12')
		expect(a.seed).toBe(b.seed)
		expect(a.level).toEqual(b.level)
	})

	it('different dates produce deterministic different challenges', () => {
		const a = generateDailyChallenge('2026-09-12')
		const b = generateDailyChallenge('2026-09-13')
		expect(a.seed).not.toBe(b.seed)
		expect(JSON.stringify(a.level)).not.toBe(JSON.stringify(b.level))
	})

	it('generated challenges validate', () => {
		for (const key of ['2026-01-01', '2026-06-15', '2026-12-31']) {
			const challenge = generateDailyChallenge(key)
			expect(validateLevelConfig(challenge.level).ok).toBe(true)
		}
	})

	it('unlimited attempts do not alter challenge config', () => {
		const before = generateDailyChallenge('2026-04-01')
		let daily = recordDailyAttempt({ ...DEFAULT_DAILY }, '2026-04-01')
		daily = recordDailyAttempt(daily, '2026-04-01')
		daily = recordDailyAttempt(daily, '2026-04-01')
		const after = generateDailyChallenge('2026-04-01')
		expect(after.level).toEqual(before.level)
		expect(daily.attemptsByDate['2026-04-01']).toBe(3)
	})
})

describe('daily completion and streak', () => {
	it('stores completion once', () => {
		let state = recordDailyCompletion({ ...DEFAULT_DAILY }, '2026-09-10')
		expect(state.completedDailyDates).toEqual(['2026-09-10'])
		state = recordDailyCompletion(state, '2026-09-10')
		expect(state.completedDailyDates).toEqual(['2026-09-10'])
		expect(state.currentStreak).toBe(1)
	})

	it('repeat completion same day does not double streak', () => {
		const once = applyDailyStreak(
			{ currentStreak: 0, bestStreak: 0, lastCompletedDailyDate: null },
			'2026-09-10',
		)
		const twice = applyDailyStreak(once, '2026-09-10')
		expect(twice.currentStreak).toBe(1)
		expect(twice.bestStreak).toBe(1)
	})

	it('yesterday→today increments streak', () => {
		const next = applyDailyStreak(
			{
				currentStreak: 2,
				bestStreak: 2,
				lastCompletedDailyDate: '2026-09-10',
			},
			'2026-09-11',
		)
		expect(next.currentStreak).toBe(3)
		expect(next.bestStreak).toBe(3)
	})

	it('gap resets streak to 1', () => {
		const next = applyDailyStreak(
			{
				currentStreak: 5,
				bestStreak: 5,
				lastCompletedDailyDate: '2026-09-08',
			},
			'2026-09-11',
		)
		expect(next.currentStreak).toBe(1)
		expect(next.bestStreak).toBe(5)
	})

	it('malformed stored date falls back safely', () => {
		const sanitized = sanitizeDaily({
			version: 1,
			currentStreak: -3,
			bestStreak: 'nope',
			lastCompletedDailyDate: 'not-a-date',
			completedDailyDates: ['2026-01-01', 'bogus', '2026-01-01'],
			attemptsByDate: { bad: 2, '2026-01-02': 1.7 },
		})
		expect(sanitized.currentStreak).toBe(0)
		expect(sanitized.bestStreak).toBe(0)
		expect(sanitized.lastCompletedDailyDate).toBeNull()
		expect(sanitized.completedDailyDates).toEqual(['2026-01-01'])
		expect(sanitized.attemptsByDate).toEqual({ '2026-01-02': 1 })
	})

	it('malformed date key does not mutate streak', () => {
		const base = {
			currentStreak: 4,
			bestStreak: 4,
			lastCompletedDailyDate: '2026-09-10',
		}
		expect(applyDailyStreak(base, 'future-ish')).toEqual(base)
	})
})

describe('endless persistence helpers', () => {
	it('updates best score and never reduces it', () => {
		let state = applyEndlessRunEnd(sanitizeEndless({}), 12)
		expect(state.bestScore).toBe(12)
		expect(state.runsPlayed).toBe(1)
		state = applyEndlessRunEnd(state, 5)
		expect(state.bestScore).toBe(12)
		expect(state.runsPlayed).toBe(2)
	})
})
