/**
 * Campaign fill / length balance guards.
 */

import { PRODUCTION_LEVELS } from '../../src/game/config/levels'
import {
	SAFE_CAPACITY_FILL_RATIO,
	theoreticalCapacity,
	validateLevelCollection,
} from '../../src/game/config/validateLevel'
import {
	COLLISION_PADDING_DEGREES,
	computeMinAngularSeparationDegrees,
} from '../../src/game/engine'

function fillStats (level: (typeof PRODUCTION_LEVELS)[number]) {
	const capacity = theoreticalCapacity(level)
	const finalObjects = level.initialObstacles.length + level.requiredThrows
	return {
		capacity,
		finalObjects,
		fillRatio: finalObjects / capacity,
		requiredThrows: level.requiredThrows,
		obstacles: level.initialObstacles.length,
	}
}

describe('campaign geometry constants', () => {
	it('documents production rim geometry', () => {
		const sample = PRODUCTION_LEVELS[0]!
		expect(sample.targetRadius).toBe(100)
		expect(sample.projectileSize).toBe(14)
		expect(COLLISION_PADDING_DEGREES).toBe(3)
		const separation = computeMinAngularSeparationDegrees(sample)
		expect(separation).toBeGreaterThan(10)
		expect(separation).toBeLessThan(12)
		expect(theoreticalCapacity(sample)).toBe(32)
	})
})

describe('campaign fill balance', () => {
	it('validates all 30 production levels', () => {
		const result = validateLevelCollection(PRODUCTION_LEVELS)
		expect(result.ok).toBe(true)
		expect(PRODUCTION_LEVELS).toHaveLength(30)
	})

	it('keeps every level under the safe capacity fill ratio', () => {
		for (const level of PRODUCTION_LEVELS) {
			const { fillRatio, finalObjects, capacity } = fillStats(level)
			expect(finalObjects).toBeLessThanOrEqual(
				Math.floor(capacity * SAFE_CAPACITY_FILL_RATIO),
			)
			expect(fillRatio).toBeLessThanOrEqual(SAFE_CAPACITY_FILL_RATIO)
		}
	})

	it('keeps Level 1 meaningful but not excessively long', () => {
		const level1 = PRODUCTION_LEVELS[0]!
		expect(level1.requiredThrows).toBeGreaterThanOrEqual(8)
		expect(level1.requiredThrows).toBeLessThanOrEqual(12)
		expect(fillStats(level1).fillRatio).toBeLessThan(0.5)
	})

	it('requires Level 6 to have a meaningful throw count', () => {
		const level6 = PRODUCTION_LEVELS.find((entry) => entry.displayNumber === 6)!
		expect(level6.requiredThrows).toBeGreaterThanOrEqual(10)
		expect(fillStats(level6).finalObjects).toBeGreaterThanOrEqual(12)
		expect(fillStats(level6).fillRatio).toBeGreaterThanOrEqual(0.4)
	})

	it('raises expected fill from early to late campaign', () => {
		const early = fillStats(PRODUCTION_LEVELS[1]!)
		const mid = fillStats(
			PRODUCTION_LEVELS.find((entry) => entry.displayNumber === 15)!,
		)
		const late = fillStats(
			PRODUCTION_LEVELS.find((entry) => entry.displayNumber === 30)!,
		)
		expect(mid.fillRatio).toBeGreaterThan(early.fillRatio)
		expect(late.fillRatio).toBeGreaterThan(mid.fillRatio)
		expect(late.fillRatio).toBeLessThanOrEqual(SAFE_CAPACITY_FILL_RATIO)
	})

	it('keeps requiredThrows positive and sensible across the campaign', () => {
		for (const level of PRODUCTION_LEVELS) {
			expect(level.requiredThrows).toBeGreaterThanOrEqual(8)
			expect(level.requiredThrows).toBeLessThanOrEqual(20)
			expect(level.initialObstacles.length).toBeLessThanOrEqual(7)
		}
	})
})
