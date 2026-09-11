/**
 * Core domain types for Precision Throw.
 * Kept free of UI / Skia dependencies so gameplay rules stay testable.
 */

/** Lifecycle of a single play session. */
export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

/** Rotation direction of the circular target. */
export type TargetDirection = 'clockwise' | 'counterClockwise'

/**
 * Static level definition.
 * Speeds and sizes are domain units (degrees / abstract radii), not pixels.
 */
export interface LevelConfig {
	id: string
	/** Human-readable level number for HUD (1-based display). */
	displayNumber: number
	/** How many successful attaches are required to win. */
	requiredThrows: number
	/** Target angular speed in degrees per second. */
	initialSpeed: number
	direction: TargetDirection
	/** Abstract target radius used by future collision math. */
	targetRadius: number
	/** Abstract projectile half-size (angular footprint uses this later). */
	projectileSize: number
	/** Pre-attached obstacles as absolute angles in degrees [0, 360). */
	initialObstacles: number[]
}

/** A projectile that has already stuck to the target rim. */
export interface AttachedProjectile {
	id: string
	/** Angle on the target circle in degrees, normalized to [0, 360). */
	angle: number
}

/**
 * Deterministic snapshot of an active round.
 * Visual presentation derives from this; it must not depend on Skia frames.
 */
export interface GameState {
	status: GameStatus
	levelId: string
	remainingThrows: number
	/**
	 * Current target orientation in degrees.
	 * Advanced by the engine from elapsed time, not from paint FPS.
	 */
	targetAngle: number
	attachedProjectiles: AttachedProjectile[]
}

/** Tunable collision threshold in degrees (half-gap between centers). */
export interface CollisionConfig {
	/** Minimum angular separation between projectile centers. */
	minAngularSeparationDegrees: number
}
