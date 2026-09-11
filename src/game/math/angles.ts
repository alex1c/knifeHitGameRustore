/**
 * Pure angular helpers for future collision detection.
 * Degrees only; no UI / Skia imports.
 */

const FULL_CIRCLE = 360

/**
 * Wraps any angle into the half-open range [0, 360).
 */
export function normalizeAngle (angle: number): number {
	const wrapped = angle % FULL_CIRCLE
	return wrapped < 0 ? wrapped + FULL_CIRCLE : wrapped
}

/**
 * Shortest absolute angular distance between two angles in degrees.
 * Correct across the 0° / 360° boundary.
 *
 * @example shortestAngularDistance(10, 20) === 10
 * @example shortestAngularDistance(350, 10) === 20
 */
export function shortestAngularDistance (a: number, b: number): number {
	const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b)) % FULL_CIRCLE
	return Math.min(diff, FULL_CIRCLE - diff)
}

/**
 * Returns true when two angular positions are closer than the given threshold.
 * Threshold is a full separation (center-to-center) in degrees.
 */
export function isAngularCollision (
	angleA: number,
	angleB: number,
	minSeparationDegrees: number,
): boolean {
	return shortestAngularDistance(angleA, angleB) < minSeparationDegrees
}

/**
 * Checks whether a candidate attach angle collides with any existing attachments.
 */
export function hasAngularCollisionWithAny (
	candidateAngle: number,
	occupiedAngles: readonly number[],
	minSeparationDegrees: number,
): boolean {
	return occupiedAngles.some((occupied) =>
		isAngularCollision(candidateAngle, occupied, minSeparationDegrees),
	)
}
