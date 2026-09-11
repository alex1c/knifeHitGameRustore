/**
 * Minimal deterministic game engine foundation.
 * Advances state from elapsed time; presentation stays outside this module.
 */

import type { CollisionConfig, GameState, LevelConfig } from '../models/types'
import { normalizeAngle } from '../math/angles'

/** Default collision gap used until Phase 2 balancing. */
export const DEFAULT_COLLISION_CONFIG: CollisionConfig = {
	minAngularSeparationDegrees: 18,
}

/**
 * Builds the initial idle/playing state for a level without remounting the app.
 * Supports instant retry by returning a fresh plain object.
 */
export function createInitialGameState (
	level: LevelConfig,
	status: GameState['status'] = 'idle',
): GameState {
	return {
		status,
		levelId: level.id,
		remainingThrows: level.requiredThrows,
		targetAngle: 0,
		attachedProjectiles: level.initialObstacles.map((angle, index) => ({
			id: `obstacle-${level.id}-${index}`,
			angle: normalizeAngle(angle),
		})),
	}
}

/**
 * Advances target rotation using elapsed wall/sim time (seconds).
 * Independent of React render rate and Skia frame timing.
 */
export function advanceTargetAngle (
	state: GameState,
	level: LevelConfig,
	deltaSeconds: number,
): GameState {
	if (state.status !== 'playing' || deltaSeconds === 0) {
		return state
	}

	const signedSpeed =
		level.direction === 'clockwise'
			? level.initialSpeed
			: -level.initialSpeed

	return {
		...state,
		targetAngle: normalizeAngle(
			state.targetAngle + signedSpeed * deltaSeconds,
		),
	}
}

/**
 * Soft reset for instant retry — same level, fresh throw budget and attachments.
 */
export function resetGameState (level: LevelConfig): GameState {
	return createInitialGameState(level, 'playing')
}
