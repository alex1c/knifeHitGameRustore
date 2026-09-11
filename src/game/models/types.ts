/**
 * Core domain types for Precision Throw.
 * Kept free of UI / Skia dependencies so gameplay rules stay testable.
 */

/**
 * Lifecycle of a single play session.
 * `projectileFlying` blocks additional throws until impact resolves.
 */
export type GameStatus =
	| 'ready'
	| 'playing'
	| 'projectileFlying'
	| 'won'
	| 'lost'

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
	/** Abstract target radius used by collision geometry. */
	targetRadius: number
	/**
	 * Full projectile width in the same abstract units as targetRadius.
	 * Used to derive angular collision separation.
	 */
	projectileSize: number
	/** Pre-attached obstacles as LOCAL target angles in degrees [0, 360). */
	initialObstacles: number[]
}

/** A projectile that has already stuck to the target rim. */
export interface AttachedProjectile {
	id: string
	/**
	 * LOCAL angle on the target circle in degrees [0, 360).
	 * Convention: 0 = top, 90 = right, 180 = bottom, 270 = left
	 * (before applying target rotation).
	 */
	angle: number
}

/**
 * Deterministic snapshot of an active round.
 * Target orientation is NOT stored here — it is derived from elapsed time.
 */
export interface GameState {
	status: GameStatus
	levelId: string
	remainingThrows: number
	attachedProjectiles: AttachedProjectile[]
	/** Elapsed ms (from round start) when the active throw began. */
	throwStartElapsedMs: number | null
	/**
	 * Logical impact elapsed ms fixed at throw start.
	 * Collision MUST use this, never a late animation callback clock read.
	 */
	impactElapsedMs: number | null
	/** Next id suffix for player-attached projectiles. */
	nextProjectileId: number
	/** Local angle of the last impact (hit or miss) for feedback. */
	lastImpactLocalAngle: number | null
}

/** Tunable collision threshold in degrees (center-to-center). */
export interface CollisionConfig {
	/** Minimum angular separation between projectile centers. */
	minAngularSeparationDegrees: number
}

/** Result of attempting to start a throw. */
export type BeginThrowResult =
	| { accepted: false; reason: 'blocked' }
	| {
			accepted: true
			state: GameState
			throwStartElapsedMs: number
			impactElapsedMs: number
	  }
