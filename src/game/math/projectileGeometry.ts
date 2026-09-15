/**
 * Single source of truth for target + projectile geometry.
 *
 * Logical units are shared by collision math and the Skia renderer
 * (renderer applies one uniform pixel scale). Cosmetic themes may change
 * silhouette style but MUST stay inside this collision envelope.
 */

import type { LevelConfig } from '../models/types'

/** Canonical logical target radius used by production levels. */
export const LOGICAL_TARGET_RADIUS = 100

/**
 * Theme-independent max tangential width (logical units).
 * Matches the drawn silhouette envelope near the blade shoulders.
 */
export const LOGICAL_PROJECTILE_WIDTH = 12

/** Tip → handle length in the same logical units as target radius. */
export const LOGICAL_PROJECTILE_LENGTH = 42

/**
 * How far the tip sits inside the circumference after a successful hit.
 * Flying impact and attached tip share this penetration.
 */
export const LOGICAL_PENETRATION = 5

/**
 * Extra angular padding beyond geometric half-widths.
 * Kept small so free visual gaps are not treated as collisions.
 */
export const COLLISION_PADDING_DEGREES = 1

/** Layout safety around the outermost handle / FX. */
export const LOGICAL_LAYOUT_MARGIN = 18

/** Gap from target rim down to the resting projectile tip. */
export const LOGICAL_LAUNCH_GAP = 30

/** Extra room for impact ring / particles. */
export const LOGICAL_FX_MARGIN = 14

const DEG_TO_RAD = Math.PI / 180

/**
 * Scales length-like geometry when a level uses a non-canonical radius.
 */
export function scaleLogical (
	value: number,
	targetRadius: number,
): number {
	return (value * targetRadius) / LOGICAL_TARGET_RADIUS
}

export function logicalProjectileWidth (targetRadius: number): number {
	return scaleLogical(LOGICAL_PROJECTILE_WIDTH, targetRadius)
}

export function logicalProjectileLength (targetRadius: number): number {
	return scaleLogical(LOGICAL_PROJECTILE_LENGTH, targetRadius)
}

export function logicalPenetration (targetRadius: number): number {
	return scaleLogical(LOGICAL_PENETRATION, targetRadius)
}

/** Distance from target center to the embedded tip. */
export function tipRadiusFromCenter (targetRadius: number): number {
	return targetRadius - logicalPenetration(targetRadius)
}

/** Distance from target center to the outward handle end. */
export function handleEndRadiusFromCenter (targetRadius: number): number {
	return (
		tipRadiusFromCenter(targetRadius) +
		logicalProjectileLength(targetRadius)
	)
}

/**
 * Minimum center-to-center angular separation derived from real width.
 */
export function computeMinAngularSeparationDegrees (
	level: Pick<LevelConfig, 'targetRadius' | 'projectileSize'>,
	paddingDegrees: number = COLLISION_PADDING_DEGREES,
): number {
	const halfWidth = level.projectileSize / 2
	const halfAngleRadians = Math.atan2(halfWidth, level.targetRadius)
	return ((2 * halfAngleRadians) * 180) / Math.PI + paddingDegrees
}

export interface AttachedProjectilePose {
	/** Tip position in the same space as centerX/centerY. */
	tipX: number
	tipY: number
	/**
	 * Skia rotation (radians) so path local +Y aligns with outward radial.
	 * Path convention: tip at (0,0), handle at (0, +length).
	 */
	rotationRadians: number
	tipRadius: number
	handleEndRadius: number
	localAngleDegrees: number
}

/**
 * Local-target-space pose for an attached projectile.
 * Tip radius and handle-end radius are angle-independent by construction.
 */
export function attachedProjectilePose (
	centerX: number,
	centerY: number,
	targetRadius: number,
	localAngleDegrees: number,
): AttachedProjectilePose {
	const tipRadius = tipRadiusFromCenter(targetRadius)
	const handleEndRadius = handleEndRadiusFromCenter(targetRadius)
	const theta = localAngleDegrees * DEG_TO_RAD
	return {
		tipX: centerX + tipRadius * Math.sin(theta),
		tipY: centerY - tipRadius * Math.cos(theta),
		// +Y (handle) must map to outward (sin θ, -cos θ) → rotate by θ + π
		rotationRadians: theta + Math.PI,
		tipRadius,
		handleEndRadius,
		localAngleDegrees,
	}
}

export interface RadialEndpoints {
	tipX: number
	tipY: number
	handleX: number
	handleY: number
	tipRadius: number
	handleEndRadius: number
}

/**
 * Radial tip / handle endpoints for an attached projectile.
 * Constructed from the same pose model the renderer uses.
 */
export function attachedRadialEndpoints (
	localAngleDegrees: number,
	targetRadius: number = LOGICAL_TARGET_RADIUS,
	centerX = 0,
	centerY = 0,
): RadialEndpoints {
	const pose = attachedProjectilePose(
		centerX,
		centerY,
		targetRadius,
		localAngleDegrees,
	)
	const theta = localAngleDegrees * DEG_TO_RAD
	const tipX = centerX + pose.tipRadius * Math.sin(theta)
	const tipY = centerY - pose.tipRadius * Math.cos(theta)
	const handleX = centerX + pose.handleEndRadius * Math.sin(theta)
	const handleY = centerY - pose.handleEndRadius * Math.cos(theta)

	return {
		tipX,
		tipY,
		handleX,
		handleY,
		tipRadius: pose.tipRadius,
		handleEndRadius: pose.handleEndRadius,
	}
}

export function distanceFromCenter (
	x: number,
	y: number,
	centerX = 0,
	centerY = 0,
): number {
	const dx = x - centerX
	const dy = y - centerY
	return Math.hypot(dx, dy)
}

export interface PlayfieldLayout {
	canvasWidth: number
	canvasHeight: number
	centerX: number
	centerY: number
	targetRadius: number
	projectileWidth: number
	projectileLength: number
	penetration: number
	/** Y of flying/ready tip (path origin). */
	restTipY: number
	/** Y of impact tip at world bottom (target local 180° when unrotated). */
	impactTipY: number
	handleEndRadius: number
	pixelScale: number
}

/**
 * Fits target + full outward handles + launch projectile into a viewport.
 * Uses one uniform scale for radius, width, length, and penetration.
 */
export function computePlayfieldLayout (
	availableWidth: number,
	availableHeight: number,
	targetRadius: number = LOGICAL_TARGET_RADIUS,
): PlayfieldLayout {
	const width = logicalProjectileWidth(targetRadius)
	const length = logicalProjectileLength(targetRadius)
	const penetration = logicalPenetration(targetRadius)
	const handleEnd = handleEndRadiusFromCenter(targetRadius)
	const margin = scaleLogical(LOGICAL_LAYOUT_MARGIN, targetRadius)
	const launchGap = scaleLogical(LOGICAL_LAUNCH_GAP, targetRadius)
	const fx = scaleLogical(LOGICAL_FX_MARGIN, targetRadius)

	const halfWidth = handleEnd + margin + fx
	const topExtent = handleEnd + margin + fx
	const bottomExtent = targetRadius + launchGap + length + margin

	const logicalW = Math.max(halfWidth * 2, 1)
	const logicalH = Math.max(topExtent + bottomExtent, 1)

	const aw = Math.max(availableWidth, 1)
	const ah = Math.max(availableHeight, 1)
	const pixelScale = Math.min(aw / logicalW, ah / logicalH)

	const canvasWidth = logicalW * pixelScale
	const canvasHeight = logicalH * pixelScale
	const centerX = canvasWidth / 2
	const centerY = topExtent * pixelScale
	const rPx = targetRadius * pixelScale

	return {
		canvasWidth,
		canvasHeight,
		centerX,
		centerY,
		targetRadius: rPx,
		projectileWidth: width * pixelScale,
		projectileLength: length * pixelScale,
		penetration: penetration * pixelScale,
		restTipY: centerY + rPx + launchGap * pixelScale,
		impactTipY: centerY + (targetRadius - penetration) * pixelScale,
		handleEndRadius: handleEnd * pixelScale,
		pixelScale,
	}
}
