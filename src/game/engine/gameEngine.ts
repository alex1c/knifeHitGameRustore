/**
 * Deterministic game engine for Меткий нож.
 *
 * Authoritative timing
 * --------------------
 * Round elapsed time is monotonic milliseconds of active play (background paused).
 * Target rotation is targetRotationAtElapsed(level, elapsedMs) — looping timeline.
 * Rendering and collision MUST both sample that timeline.
 * Impact angle is fixed at throw start as throwStart + FLIGHT_DURATION_MS.
 */

import type {
	BeginThrowResult,
	CollisionConfig,
	GameState,
	LevelConfig,
} from '../models/types'
import {
	hasAngularCollisionWithAny,
	normalizeAngle,
	WORLD_IMPACT_ANGLE_DEGREES,
	worldAngleToLocalAngle,
} from '../math/angles'
import { targetRotationAtElapsed } from './timeline'

/** Vertical flight duration in milliseconds (arcade timing feel). */
export const FLIGHT_DURATION_MS = 160

/** Extra angular padding beyond geometric shaft width. */
export const COLLISION_PADDING_DEGREES = 3

/**
 * Authoritative target rotation angle (normalized) at elapsed round time.
 */
export function targetAngleAtElapsed (
	level: LevelConfig,
	elapsedMs: number,
): number {
	return targetRotationAtElapsed(level, elapsedMs).angle
}

/**
 * Local attach angle for a bottom-world impact at the given elapsed time.
 */
export function localImpactAngleAtElapsed (
	level: LevelConfig,
	elapsedMs: number,
): number {
	const targetAngle = targetAngleAtElapsed(level, elapsedMs)
	return worldAngleToLocalAngle(WORLD_IMPACT_ANGLE_DEGREES, targetAngle)
}

/**
 * Minimum center-to-center angular separation from geometry.
 * For two equal projectiles this is 2 × halfAngle (+ padding),
 * i.e. the sum of both angular half-extents on the rim.
 */
export function computeMinAngularSeparationDegrees (
	level: LevelConfig,
	paddingDegrees: number = COLLISION_PADDING_DEGREES,
): number {
	const halfWidth = level.projectileSize / 2
	const halfAngleRadians = Math.atan2(halfWidth, level.targetRadius)
	const minSeparation =
		((2 * halfAngleRadians) * 180) / Math.PI + paddingDegrees
	return minSeparation
}

export function collisionConfigForLevel (
	level: LevelConfig,
): CollisionConfig {
	return {
		minAngularSeparationDegrees: computeMinAngularSeparationDegrees(level),
	}
}

export const DEFAULT_COLLISION_CONFIG: CollisionConfig = {
	minAngularSeparationDegrees: 12,
}

/**
 * Builds a fresh playable round for a level (instant retry friendly).
 */
export function createInitialGameState (
	level: LevelConfig,
	status: GameState['status'] = 'playing',
): GameState {
	return {
		status,
		levelId: level.id,
		remainingThrows: level.requiredThrows,
		attachedProjectiles: level.initialObstacles.map((angle, index) => ({
			id: `obstacle-${level.id}-${index}`,
			angle: normalizeAngle(angle),
		})),
		throwStartElapsedMs: null,
		impactElapsedMs: null,
		nextProjectileId: 1,
		lastImpactLocalAngle: null,
	}
}

/**
 * Soft reset for instant retry — same level, fresh throw budget and obstacles.
 */
export function resetGameState (level: LevelConfig): GameState {
	return createInitialGameState(level, 'playing')
}

/**
 * Attempts to start a throw at the given authoritative elapsed time.
 * Rejects when not in `playing` (includes flying / won / lost / ready).
 */
export function tryBeginThrow (
	state: GameState,
	elapsedMs: number,
): BeginThrowResult {
	if (state.status !== 'playing') {
		return { accepted: false, reason: 'blocked' }
	}

	const impactElapsedMs = elapsedMs + FLIGHT_DURATION_MS

	return {
		accepted: true,
		throwStartElapsedMs: elapsedMs,
		impactElapsedMs,
		state: {
			...state,
			status: 'projectileFlying',
			throwStartElapsedMs: elapsedMs,
			impactElapsedMs,
			lastImpactLocalAngle: null,
		},
	}
}

/**
 * Resolves impact using the precomputed logical impact elapsed time.
 * Does not read any live clock — fairness depends on this.
 */
export function resolveThrowImpact (
	state: GameState,
	level: LevelConfig,
	impactElapsedMs: number,
	collision: CollisionConfig = collisionConfigForLevel(level),
): GameState {
	if (state.status !== 'projectileFlying') {
		return state
	}

	const localAngle = localImpactAngleAtElapsed(level, impactElapsedMs)
	const occupied = state.attachedProjectiles.map((p) => p.angle)

	if (
		hasAngularCollisionWithAny(
			localAngle,
			occupied,
			collision.minAngularSeparationDegrees,
		)
	) {
		return {
			...state,
			status: 'lost',
			throwStartElapsedMs: null,
			impactElapsedMs: null,
			lastImpactLocalAngle: localAngle,
		}
	}

	const attached = {
		id: `throw-${state.nextProjectileId}`,
		angle: localAngle,
	}

	const remainingThrows = state.remainingThrows - 1
	const won = remainingThrows <= 0

	return {
		...state,
		status: won ? 'won' : 'playing',
		remainingThrows,
		attachedProjectiles: [...state.attachedProjectiles, attached],
		throwStartElapsedMs: null,
		impactElapsedMs: null,
		nextProjectileId: state.nextProjectileId + 1,
		lastImpactLocalAngle: localAngle,
	}
}

export {
	compileLevelTimeline,
	compileTimeline,
	constantSegment,
	integrateRampDegrees,
	pauseSegment,
	rampSegment,
	sampleCompiledTimeline,
	segmentTotalDegrees,
	targetRotationAtElapsed,
} from './timeline'
