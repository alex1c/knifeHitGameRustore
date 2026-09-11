/**
 * Unit tests for the deterministic engine foundation.
 */

import { DEFAULT_LEVEL, getLevelById } from '../../src/game/config/levels'
import {
	advanceTargetAngle,
	createInitialGameState,
	resetGameState,
} from '../../src/game/engine/gameEngine'
import { normalizeAngle } from '../../src/game/math/angles'

describe('gameEngine foundation', () => {
	it('creates initial state from level config', () => {
		const state = createInitialGameState(DEFAULT_LEVEL, 'playing')
		expect(state.status).toBe('playing')
		expect(state.levelId).toBe(DEFAULT_LEVEL.id)
		expect(state.remainingThrows).toBe(DEFAULT_LEVEL.requiredThrows)
		expect(state.attachedProjectiles).toHaveLength(
			DEFAULT_LEVEL.initialObstacles.length,
		)
		const firstObstacle = DEFAULT_LEVEL.initialObstacles[0] ?? 0
		expect(state.attachedProjectiles[0]?.angle).toBe(
			normalizeAngle(firstObstacle),
		)
	})

	it('advances target angle using elapsed time, not frames', () => {
		const level = getLevelById('level-1')
		const state = createInitialGameState(level, 'playing')
		const next = advanceTargetAngle(state, level, 1)
		expect(next.targetAngle).toBe(normalizeAngle(level.initialSpeed))
	})

	it('respects counter-clockwise direction', () => {
		const level = getLevelById('level-2')
		const state = createInitialGameState(level, 'playing')
		const next = advanceTargetAngle(state, level, 1)
		expect(next.targetAngle).toBe(normalizeAngle(-level.initialSpeed))
	})

	it('does not advance while idle', () => {
		const state = createInitialGameState(DEFAULT_LEVEL, 'idle')
		const next = advanceTargetAngle(state, DEFAULT_LEVEL, 2)
		expect(next.targetAngle).toBe(0)
	})

	it('resetGameState restores throws for instant retry', () => {
		const reset = resetGameState(DEFAULT_LEVEL)
		expect(reset.status).toBe('playing')
		expect(reset.remainingThrows).toBe(DEFAULT_LEVEL.requiredThrows)
		expect(reset.targetAngle).toBe(0)
	})
})
