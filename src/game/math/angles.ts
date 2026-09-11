/**
 * Pure angular helpers and coordinate transforms.
 * Degrees only; no UI / Skia imports.
 *
 * Coordinate conventions
 * ----------------------
 * World / local angles share the same numbering:
 *   0°   = top
 *   90°  = right
 *   180° = bottom  ← vertical throws always impact here in world space
 *   270° = left
 * Positive rotation is clockwise (matches Skia Group rotate with y-down).
 *
 * targetAngle (target rotation):
 *   Derived from elapsed time and level speed/direction.
 *   A point at localAngle appears at:
 *     worldAngle = normalizeAngle(localAngle + targetAngle)
 *
 * Therefore:
 *   localAngle = normalizeAngle(worldAngle - targetAngle)
 */

const FULL_CIRCLE = 360

/**
 * World-space impact point for a vertical throw from the bottom center.
 * Projectile always flies to the bottom of the target circle.
 */
export const WORLD_IMPACT_ANGLE_DEGREES = 180

/**
 * Wraps any angle into the half-open range [0, 360).
 */
export function normalizeAngle (angle: number): number {
	'worklet'
	const wrapped = angle % FULL_CIRCLE
	return wrapped < 0 ? wrapped + FULL_CIRCLE : wrapped
}

/**
 * Shortest absolute angular distance between two angles in degrees.
 * Correct across the 0° / 360° boundary.
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

/**
 * Converts a world-space rim angle into the target's local attach angle.
 *
 * @param worldAngleDegrees - Angle in world space (0 = top)
 * @param targetRotationDegrees - Current target rotation (same convention)
 */
export function worldAngleToLocalAngle (
	worldAngleDegrees: number,
	targetRotationDegrees: number,
): number {
	return normalizeAngle(worldAngleDegrees - targetRotationDegrees)
}

/**
 * Inverse of worldAngleToLocalAngle — useful for tests and debug overlays.
 */
export function localAngleToWorldAngle (
	localAngleDegrees: number,
	targetRotationDegrees: number,
): number {
	return normalizeAngle(localAngleDegrees + targetRotationDegrees)
}
