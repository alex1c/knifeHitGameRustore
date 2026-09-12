/**
 * Aggregate stats semantic event accounting.
 */

import {
	DEFAULT_STATS,
	recordCampaignLevelCompleted,
	recordCollision,
	recordDailyCompletedStat,
	recordEndlessRunEnd,
	recordSuccessfulHit,
	recordThrowStarted,
	sanitizeStats,
} from '../../src/storage/statsStore'

describe('stats accounting', () => {
	it('successful hit increments once', () => {
		const next = recordSuccessfulHit(DEFAULT_STATS)
		expect(next.successfulHits).toBe(1)
		expect(recordSuccessfulHit(next).successfulHits).toBe(2)
	})

	it('collision increments once', () => {
		expect(recordCollision(DEFAULT_STATS).collisions).toBe(1)
	})

	it('throw started increments totalThrows', () => {
		expect(recordThrowStarted(DEFAULT_STATS).totalThrows).toBe(1)
	})

	it('retry semantics: re-emitting events after reset counts new actions only', () => {
		let stats = recordThrowStarted(DEFAULT_STATS)
		stats = recordSuccessfulHit(stats)
		stats = recordThrowStarted(stats)
		stats = recordCollision(stats)
		expect(stats.totalThrows).toBe(2)
		expect(stats.successfulHits).toBe(1)
		expect(stats.collisions).toBe(1)
	})

	it('endless run count increments once per run end', () => {
		let stats = recordEndlessRunEnd(DEFAULT_STATS, 10)
		expect(stats.endlessRuns).toBe(1)
		expect(stats.bestEndlessScore).toBe(10)
		stats = recordEndlessRunEnd(stats, 4)
		expect(stats.endlessRuns).toBe(2)
		expect(stats.bestEndlessScore).toBe(10)
	})

	it('daily completion count increments once per date', () => {
		let stats = recordDailyCompletedStat(
			DEFAULT_STATS,
			'2026-09-12',
			1,
			1,
			false,
		)
		expect(stats.dailyCompletedCount).toBe(1)
		stats = recordDailyCompletedStat(stats, '2026-09-12', 1, 1, true)
		expect(stats.dailyCompletedCount).toBe(1)
	})

	it('campaign completed count tracks max', () => {
		let stats = recordCampaignLevelCompleted(DEFAULT_STATS, 3)
		stats = recordCampaignLevelCompleted(stats, 2)
		expect(stats.campaignLevelsCompleted).toBe(3)
	})

	it('malformed stats fallback', () => {
		const sanitized = sanitizeStats({
			totalThrows: -1,
			successfulHits: 'x',
			collisions: Infinity,
			lastDailyCompletedDate: 'nope',
		})
		expect(sanitized.totalThrows).toBe(0)
		expect(sanitized.successfulHits).toBe(0)
		expect(sanitized.collisions).toBe(0)
		expect(sanitized.lastDailyCompletedDate).toBeNull()
	})
})
