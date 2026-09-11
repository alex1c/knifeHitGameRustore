/**
 * Unit tests for the deterministic Phase 2/3 game engine.
 */

import {
	DEFAULT_LEVEL,
	getLevelById,
	getNextLevelId,
} from '../../src/game/config/levels'
import {
	FLIGHT_DURATION_MS,
	computeMinAngularSeparationDegrees,
	constantSegment,
	createInitialGameState,
	localImpactAngleAtElapsed,
	pauseSegment,
	rampSegment,
	resetGameState,
	resolveThrowImpact,
	targetAngleAtElapsed,
	targetRotationAtElapsed,
	tryBeginThrow,
} from '../../src/game/engine'
import {
	normalizeAngle,
	WORLD_IMPACT_ANGLE_DEGREES,
	worldAngleToLocalAngle,
} from '../../src/game/math/angles'
import type { LevelConfig } from '../../src/game/models'

function withSegments (
	base: LevelConfig,
	segments: LevelConfig['segments'],
	overrides: Partial<LevelConfig> = {},
): LevelConfig {
	return { ...base, segments, ...overrides }
}

describe('authoritative target angle', () => {
	it('computes clockwise rotation from elapsed time', () => {
		const level = getLevelById('level-1')
		const sample = targetRotationAtElapsed(level, 1000)
		expect(sample.signedSpeed).toBeGreaterThan(0)
		expect(targetAngleAtElapsed(level, 1000)).toBe(sample.angle)
	})

	it('computes counter-clockwise rotation from elapsed time', () => {
		const level = getLevelById('level-2')
		expect(targetRotationAtElapsed(level, 1000).signedSpeed).toBeLessThan(0)
	})

	it('derives local impact angle from world bottom and target rotation', () => {
		const level = getLevelById('level-1')
		const elapsedMs = 2500
		const targetAngle = targetAngleAtElapsed(level, elapsedMs)
		expect(localImpactAngleAtElapsed(level, elapsedMs)).toBe(
			worldAngleToLocalAngle(WORLD_IMPACT_ANGLE_DEGREES, targetAngle),
		)
	})
})

describe('collision geometry', () => {
	it('derives a positive separation from radius and projectile size', () => {
		const separation = computeMinAngularSeparationDegrees(DEFAULT_LEVEL)
		expect(separation).toBeGreaterThan(5)
		expect(separation).toBeLessThan(30)
	})
})

describe('throw lifecycle', () => {
	it('creates initial state with obstacles as local attachments', () => {
		const state = createInitialGameState(DEFAULT_LEVEL, 'playing')
		expect(state.status).toBe('playing')
		expect(state.remainingThrows).toBe(DEFAULT_LEVEL.requiredThrows)
		expect(state.attachedProjectiles).toHaveLength(
			DEFAULT_LEVEL.initialObstacles.length,
		)
	})

	it('successful throw decreases remainingThrows and attaches projectile', () => {
		const level = withSegments(
			DEFAULT_LEVEL,
			[constantSegment(4000, 0)],
			{ initialObstacles: [], requiredThrows: 5 },
		)
		let state = createInitialGameState(level, 'playing')
		const begun = tryBeginThrow(state, 0)
		expect(begun.accepted).toBe(true)
		if (!begun.accepted) {
			return
		}
		state = resolveThrowImpact(begun.state, level, begun.impactElapsedMs)
		expect(state.status).toBe('playing')
		expect(state.remainingThrows).toBe(level.requiredThrows - 1)
		expect(state.attachedProjectiles).toHaveLength(1)
	})

	it('failed throw sets status to lost when hitting an obstacle', () => {
		const level = withSegments(
			DEFAULT_LEVEL,
			[constantSegment(4000, 0)],
			{ initialObstacles: [180], requiredThrows: 5 },
		)
		const begun = tryBeginThrow(
			createInitialGameState(level, 'playing'),
			0,
		)
		expect(begun.accepted).toBe(true)
		if (!begun.accepted) {
			return
		}
		const state = resolveThrowImpact(
			begun.state,
			level,
			begun.impactElapsedMs,
		)
		expect(state.status).toBe('lost')
		expect(state.lastImpactLocalAngle).toBe(180)
	})

	it('last successful throw sets status to won', () => {
		const level = withSegments(
			DEFAULT_LEVEL,
			[constantSegment(4000, 0)],
			{ initialObstacles: [], requiredThrows: 1 },
		)
		const begun = tryBeginThrow(
			createInitialGameState(level, 'playing'),
			0,
		)
		if (!begun.accepted) {
			throw new Error('expected throw to be accepted')
		}
		const state = resolveThrowImpact(
			begun.state,
			level,
			begun.impactElapsedMs,
		)
		expect(state.status).toBe('won')
		expect(state.remainingThrows).toBe(0)
	})

	it('retry restores original obstacles and throw count', () => {
		const level = getLevelById('level-2')
		let state = createInitialGameState(level, 'playing')
		const begun = tryBeginThrow(state, 100)
		if (!begun.accepted) {
			throw new Error('expected throw to be accepted')
		}
		state = resolveThrowImpact(begun.state, level, begun.impactElapsedMs)
		state = resetGameState(level)
		expect(state.status).toBe('playing')
		expect(state.remainingThrows).toBe(level.requiredThrows)
		expect(state.attachedProjectiles).toHaveLength(
			level.initialObstacles.length,
		)
		expect(state.throwStartElapsedMs).toBeNull()
	})

	it('rejects throw while projectile is already flying', () => {
		const state = createInitialGameState(DEFAULT_LEVEL, 'playing')
		const first = tryBeginThrow(state, 50)
		expect(first.accepted).toBe(true)
		if (!first.accepted) {
			return
		}
		expect(tryBeginThrow(first.state, 60).accepted).toBe(false)
	})

	it('rejects throw after loss and after win', () => {
		const lost = {
			...createInitialGameState(DEFAULT_LEVEL, 'playing'),
			status: 'lost' as const,
		}
		const won = {
			...createInitialGameState(DEFAULT_LEVEL, 'playing'),
			status: 'won' as const,
		}
		expect(tryBeginThrow(lost, 10).accepted).toBe(false)
		expect(tryBeginThrow(won, 10).accepted).toBe(false)
	})

	it('uses precomputed impact elapsed time, not a later clock', () => {
		const level = withSegments(
			DEFAULT_LEVEL,
			[constantSegment(4000, 90)],
			{ initialObstacles: [] },
		)
		const begun = tryBeginThrow(
			createInitialGameState(level, 'playing'),
			1000,
		)
		if (!begun.accepted) {
			throw new Error('expected throw to be accepted')
		}
		expect(begun.impactElapsedMs).toBe(1000 + FLIGHT_DURATION_MS)
		const expectedLocal = localImpactAngleAtElapsed(
			level,
			begun.impactElapsedMs,
		)
		const resolved = resolveThrowImpact(
			begun.state,
			level,
			begun.impactElapsedMs,
		)
		expect(resolved.lastImpactLocalAngle).toBe(expectedLocal)
		const lateLocal = localImpactAngleAtElapsed(level, 1000 + 500)
		expect(expectedLocal).not.toBe(lateLocal)
	})

	it('detects head-on obstacle collision', () => {
		const level = withSegments(
			DEFAULT_LEVEL,
			[constantSegment(4000, 0)],
			{ initialObstacles: [180] },
		)
		const headOn = resolveThrowImpact(
			{
				...createInitialGameState(level, 'playing'),
				status: 'projectileFlying',
			},
			level,
			0,
		)
		expect(headOn.status).toBe('lost')
	})
})

describe('timeline collision scenarios', () => {
	it('impact during speed ramp uses timeline sample', () => {
		const level = withSegments(DEFAULT_LEVEL, [
			rampSegment(3000, 20, 70),
		], { initialObstacles: [] })
		const begun = tryBeginThrow(
			createInitialGameState(level, 'playing'),
			500,
		)
		if (!begun.accepted) {
			throw new Error('expected accept')
		}
		const resolved = resolveThrowImpact(
			begun.state,
			level,
			begun.impactElapsedMs,
		)
		expect(resolved.lastImpactLocalAngle).toBe(
			localImpactAngleAtElapsed(level, begun.impactElapsedMs),
		)
		expect(resolved.status).toBe('playing')
	})

	it('impact during pause uses fixed target angle', () => {
		const level = withSegments(DEFAULT_LEVEL, [
			constantSegment(1000, 40),
			pauseSegment(800),
			constantSegment(1000, 40),
		], { initialObstacles: [] })
		const throwAt = 1200
		const begun = tryBeginThrow(
			createInitialGameState(level, 'playing'),
			throwAt,
		)
		if (!begun.accepted) {
			throw new Error('expected accept')
		}
		const a = localImpactAngleAtElapsed(level, begun.impactElapsedMs)
		const b = localImpactAngleAtElapsed(level, throwAt + 50)
		expect(a).toBeCloseTo(b, 5)
		const resolved = resolveThrowImpact(
			begun.state,
			level,
			begun.impactElapsedMs,
		)
		expect(resolved.lastImpactLocalAngle).toBe(a)
	})

	it('impact after reversal uses post-reversal timeline angle', () => {
		const level = withSegments(DEFAULT_LEVEL, [
			constantSegment(1000, 40),
			constantSegment(1000, -40),
		], { initialObstacles: [] })
		const begun = tryBeginThrow(
			createInitialGameState(level, 'playing'),
			1100,
		)
		if (!begun.accepted) {
			throw new Error('expected accept')
		}
		expect(targetRotationAtElapsed(level, begun.impactElapsedMs).signedSpeed).toBe(-40)
		const resolved = resolveThrowImpact(
			begun.state,
			level,
			begun.impactElapsedMs,
		)
		expect(resolved.lastImpactLocalAngle).toBe(
			localImpactAngleAtElapsed(level, begun.impactElapsedMs),
		)
	})
})

describe('rapid tap protection', () => {
	it('only the first tryBeginThrow in a burst is accepted', () => {
		let state = createInitialGameState(DEFAULT_LEVEL, 'playing')
		const results = []
		for (let i = 0; i < 10; i += 1) {
			const result = tryBeginThrow(state, i)
			results.push(result.accepted)
			if (result.accepted) {
				state = result.state
			}
		}
		expect(results.filter(Boolean)).toHaveLength(1)
		expect(state.status).toBe('projectileFlying')
	})
})

describe('five consecutive resets regression', () => {
	it('restores clean playing state five times and accepts a new throw', () => {
		const level = getLevelById('level-4')
		let state = createInitialGameState(level, 'playing')

		for (let i = 0; i < 5; i += 1) {
			const begun = tryBeginThrow(state, 200 + i)
			expect(begun.accepted).toBe(true)
			if (!begun.accepted) {
				return
			}
			state = resolveThrowImpact(begun.state, level, begun.impactElapsedMs)
			state = resetGameState(level)
			expect(state.status).toBe('playing')
			expect(state.remainingThrows).toBe(level.requiredThrows)
			expect(state.attachedProjectiles).toHaveLength(
				level.initialObstacles.length,
			)
			expect(state.throwStartElapsedMs).toBeNull()
			expect(state.impactElapsedMs).toBeNull()
			expect(
				state.attachedProjectiles.map((p) => p.angle),
			).toEqual(level.initialObstacles.map((a) => normalizeAngle(a)))
		}

		const after = tryBeginThrow(state, 999)
		expect(after.accepted).toBe(true)
	})
})

describe('campaign next-level helpers', () => {
	it('Level 29 → Level 30 and Level 30 → null', () => {
		expect(getNextLevelId('level-29')).toBe('level-30')
		expect(getNextLevelId('level-30')).toBeNull()
	})
})
