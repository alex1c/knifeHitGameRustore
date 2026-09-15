/**
 * Level config validation tests + production collection guard.
 */

import {
	PRODUCTION_LEVELS,
} from '../../src/game/config/levels'
import {
	theoreticalCapacity,
	validateLevelCollection,
	validateLevelConfig,
} from '../../src/game/config/validateLevel'
import { constantSegment } from '../../src/game/engine'
import type { LevelConfig } from '../../src/game/models'

function validLevel (overrides: Partial<LevelConfig> = {}): LevelConfig {
	return {
		id: 'level-test',
		displayNumber: 99,
		requiredThrows: 5,
		targetRadius: 100,
		projectileSize: 12,
		initialObstacles: [0],
		segments: [constantSegment(2000, 40)],
		...overrides,
	}
}

describe('validateLevelConfig', () => {
	it('accepts a sane level', () => {
		expect(validateLevelConfig(validLevel()).ok).toBe(true)
	})

	it('rejects invalid requiredThrows', () => {
		const result = validateLevelConfig(validLevel({ requiredThrows: 0 }))
		expect(result.ok).toBe(false)
		expect(result.issues.some((i) => i.path === 'requiredThrows')).toBe(true)
	})

	it('rejects invalid geometry', () => {
		expect(
			validateLevelConfig(validLevel({ targetRadius: 1 })).ok,
		).toBe(false)
		expect(
			validateLevelConfig(validLevel({ projectileSize: 100 })).ok,
		).toBe(false)
	})

	it('rejects empty timeline and bad durations', () => {
		expect(validateLevelConfig(validLevel({ segments: [] })).ok).toBe(false)
		expect(
			validateLevelConfig(
				validLevel({
					segments: [{ durationMs: 10, startSpeed: 40, endSpeed: 40 }],
				}),
			).ok,
		).toBe(false)
	})

	it('rejects invalid speed', () => {
		expect(
			validateLevelConfig(
				validLevel({
					segments: [{ durationMs: 1000, startSpeed: 999, endSpeed: 999 }],
				}),
			).ok,
		).toBe(false)
	})

	it('rejects overlapping initial obstacles', () => {
		const result = validateLevelConfig(
			validLevel({ initialObstacles: [0, 2] }),
		)
		expect(result.ok).toBe(false)
		expect(
			result.issues.some((i) => i.message.includes('overlaps')),
		).toBe(true)
	})

	it('rejects obvious capacity overflow', () => {
		const level = validLevel({
			requiredThrows: 12,
			initialObstacles: [0, 60, 120, 180, 240, 300],
			projectileSize: 28,
			targetRadius: 40,
		})
		const capacity = theoreticalCapacity(level)
		expect(capacity).toBeLessThan(
			level.initialObstacles.length + level.requiredThrows,
		)
		expect(validateLevelConfig(level).ok).toBe(false)
	})
})

describe('validateLevelCollection', () => {
	it('detects duplicate ids', () => {
		const result = validateLevelCollection([
			validLevel({ id: 'a', displayNumber: 1 }),
			validLevel({ id: 'a', displayNumber: 2 }),
		])
		expect(result.ok).toBe(false)
		expect(result.issues.some((i) => i.message.includes('duplicate id'))).toBe(
			true,
		)
	})

	it('production campaign of 30 levels is valid', () => {
		expect(PRODUCTION_LEVELS).toHaveLength(30)
		const result = validateLevelCollection(PRODUCTION_LEVELS)
		expect(result.ok).toBe(true)
		if (!result.ok) {
			// Helpful failure output for future config edits.
			throw new Error(JSON.stringify(result.issues, null, 2))
		}
	})
})
