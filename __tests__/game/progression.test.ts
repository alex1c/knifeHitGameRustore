/**
 * Progression sanitize / unlock / replay monotonicity tests.
 */

import {
	DEFAULT_PROGRESSION,
	applyLevelCompleted,
	getContinueLevelId,
	sanitizeProgression,
} from '../../src/storage/progression'

describe('sanitizeProgression', () => {
	it('falls back safely on malformed data', () => {
		expect(sanitizeProgression(null)).toEqual({
			...DEFAULT_PROGRESSION,
			completedLevels: [],
		})
		expect(sanitizeProgression({ highestUnlockedLevel: 'nope' })).toEqual({
			version: 1,
			highestUnlockedLevel: 1,
			completedLevels: [],
		})
	})

	it('clamps unlocked and filters completed', () => {
		const sanitized = sanitizeProgression({
			version: 99,
			highestUnlockedLevel: 100,
			completedLevels: [1, 2, 'x', 99],
		})
		expect(sanitized.highestUnlockedLevel).toBe(30)
		expect(sanitized.completedLevels).toEqual([1, 2])
	})
})

describe('applyLevelCompleted', () => {
	it('unlocks the next level from a fresh install', () => {
		const next = applyLevelCompleted(DEFAULT_PROGRESSION, 1)
		expect(next.highestUnlockedLevel).toBe(2)
		expect(next.completedLevels).toContain(1)
	})

	it('replay does not decrease progression', () => {
		const advanced = {
			version: 1 as const,
			highestUnlockedLevel: 10,
			completedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9],
		}
		const afterReplay = applyLevelCompleted(advanced, 3)
		expect(afterReplay.highestUnlockedLevel).toBe(10)
		expect(afterReplay.completedLevels).toContain(3)
	})

	it('completing level 30 keeps unlock at 30', () => {
		const nearEnd = {
			version: 1 as const,
			highestUnlockedLevel: 30,
			completedLevels: [29],
		}
		const done = applyLevelCompleted(nearEnd, 30)
		expect(done.highestUnlockedLevel).toBe(30)
		expect(done.completedLevels).toContain(30)
	})

	it('continue id tracks highest unlocked', () => {
		expect(getContinueLevelId(DEFAULT_PROGRESSION)).toBe('level-1')
		expect(
			getContinueLevelId({
				version: 1,
				highestUnlockedLevel: 12,
				completedLevels: [1],
			}),
		).toBe('level-12')
	})
})
