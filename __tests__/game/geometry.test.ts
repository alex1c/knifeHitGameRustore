/**
 * Geometry / attachment / collision regression for the critical hotfix.
 */

import {
	hasAngularCollisionWithAny,
	isAngularCollision,
} from '../../src/game/math/angles'
import {
	COLLISION_PADDING_DEGREES,
	LOGICAL_PROJECTILE_LENGTH,
	LOGICAL_PROJECTILE_WIDTH,
	LOGICAL_TARGET_RADIUS,
	attachedProjectilePose,
	attachedRadialEndpoints,
	computeMinAngularSeparationDegrees,
	computePlayfieldLayout,
	distanceFromCenter,
	handleEndRadiusFromCenter,
	tipRadiusFromCenter,
} from '../../src/game/math/projectileGeometry'
import { PRODUCTION_LEVELS } from '../../src/game/config/levels'
import { theoreticalCapacity } from '../../src/game/config/validateLevel'

const CARDINAL = [0, 90, 180, 270] as const
const DIAGONAL = [45, 135, 225, 315] as const
const ALL_TEST_ANGLES = [...CARDINAL, ...DIAGONAL]
const EPS = 1e-9

describe('attached projectile radial consistency', () => {
	it('keeps tip radius identical at cardinal and diagonal angles', () => {
		const expected = tipRadiusFromCenter(LOGICAL_TARGET_RADIUS)
		for (const angle of ALL_TEST_ANGLES) {
			const ends = attachedRadialEndpoints(angle)
			expect(ends.tipRadius).toBeCloseTo(expected, 10)
			expect(distanceFromCenter(ends.tipX, ends.tipY)).toBeCloseTo(
				expected,
				10,
			)
		}
	})

	it('keeps handle-end radius identical at cardinal and diagonal angles', () => {
		const expected = handleEndRadiusFromCenter(LOGICAL_TARGET_RADIUS)
		for (const angle of ALL_TEST_ANGLES) {
			const ends = attachedRadialEndpoints(angle)
			expect(ends.handleEndRadius).toBeCloseTo(expected, 10)
			expect(distanceFromCenter(ends.handleX, ends.handleY)).toBeCloseTo(
				expected,
				10,
			)
		}
	})

	it('places handle farther out than tip by exactly projectile length', () => {
		for (const angle of ALL_TEST_ANGLES) {
			const ends = attachedRadialEndpoints(angle)
			expect(ends.handleEndRadius - ends.tipRadius).toBeCloseTo(
				LOGICAL_PROJECTILE_LENGTH,
				10,
			)
		}
	})

	it('uses rotation that maps path +Y to the outward radial', () => {
		for (const angle of ALL_TEST_ANGLES) {
			const pose = attachedProjectilePose(0, 0, LOGICAL_TARGET_RADIUS, angle)
			const length = LOGICAL_PROJECTILE_LENGTH
			// Skia rotate: (0,L) → (-L sin φ, L cos φ) with φ = rotation
			const rotatedX = -length * Math.sin(pose.rotationRadians)
			const rotatedY = length * Math.cos(pose.rotationRadians)
			const handleX = pose.tipX + rotatedX
			const handleY = pose.tipY + rotatedY
			const ends = attachedRadialEndpoints(angle)
			expect(handleX).toBeCloseTo(ends.handleX, 9)
			expect(handleY).toBeCloseTo(ends.handleY, 9)
		}
	})
})

describe('collision envelope vs visible width', () => {
	const level = {
		targetRadius: LOGICAL_TARGET_RADIUS,
		projectileSize: LOGICAL_PROJECTILE_WIDTH,
	}
	const separation = computeMinAngularSeparationDegrees(level)

	it('derives separation from real width with small padding', () => {
		expect(COLLISION_PADDING_DEGREES).toBe(1)
		expect(level.projectileSize).toBe(12)
		expect(separation).toBeGreaterThan(7)
		expect(separation).toBeLessThan(9)
		expect(theoreticalCapacity(level)).toBe(45)
	})

	it('A: visibly safe gap does not collide', () => {
		expect(isAngularCollision(0, separation + 0.5, separation)).toBe(false)
	})

	it('B: clear overlap collides', () => {
		expect(isAngularCollision(0, separation * 0.25, separation)).toBe(true)
	})

	it('C: exactly at threshold is not a collision (strict <)', () => {
		expect(isAngularCollision(0, separation, separation)).toBe(false)
	})

	it('D: wraps across 0/360', () => {
		expect(isAngularCollision(2, 358, separation)).toBe(true)
		expect(isAngularCollision(0, 180, separation)).toBe(false)
	})

	it('E: candidate in a free gap among 12 attachments does not false-collide', () => {
		const occupied = Array.from({ length: 12 }, (_, i) => i * 30)
		// Mid-gap between 0° and 30°
		const candidate = 15
		expect(
			hasAngularCollisionWithAny(candidate, occupied, separation),
		).toBe(false)
	})

	it('F: theme-independent envelope uses level projectileSize only', () => {
		const classic = computeMinAngularSeparationDegrees(level)
		const neon = computeMinAngularSeparationDegrees({
			...level,
			projectileSize: LOGICAL_PROJECTILE_WIDTH,
		})
		expect(classic).toBe(neon)
	})
})

describe('playfield layout fit', () => {
	it('fits target + handles inside canvas for 1080×2400-like stage', () => {
		// Approximate usable stage after HUD on OPPO 1080×2400
		const layout = computePlayfieldLayout(1000, 1400, LOGICAL_TARGET_RADIUS)
		expect(layout.centerY - layout.handleEndRadius).toBeGreaterThanOrEqual(
			-EPS,
		)
		expect(
			layout.centerY + layout.handleEndRadius,
		).toBeLessThanOrEqual(layout.canvasHeight + EPS)
		expect(
			layout.centerX - layout.handleEndRadius,
		).toBeGreaterThanOrEqual(-EPS)
		expect(
			layout.centerX + layout.handleEndRadius,
		).toBeLessThanOrEqual(layout.canvasWidth + EPS)
		expect(layout.restTipY + layout.projectileLength).toBeLessThanOrEqual(
			layout.canvasHeight + EPS,
		)
	})

	it('fits target + handles inside canvas for 1080×1920-like stage', () => {
		const layout = computePlayfieldLayout(1000, 1000, LOGICAL_TARGET_RADIUS)
		expect(layout.centerY - layout.handleEndRadius).toBeGreaterThanOrEqual(
			-EPS,
		)
		expect(
			layout.centerY + layout.handleEndRadius,
		).toBeLessThanOrEqual(layout.canvasHeight + EPS)
		expect(layout.canvasWidth).toBeLessThanOrEqual(1000 + EPS)
		expect(layout.canvasHeight).toBeLessThanOrEqual(1000 + EPS)
	})

	it('scales radius, width, and length with one uniform factor', () => {
		const layout = computePlayfieldLayout(800, 1200, LOGICAL_TARGET_RADIUS)
		const scale = layout.pixelScale
		expect(layout.targetRadius).toBeCloseTo(LOGICAL_TARGET_RADIUS * scale, 6)
		expect(layout.projectileWidth).toBeCloseTo(
			LOGICAL_PROJECTILE_WIDTH * scale,
			6,
		)
		expect(layout.projectileLength).toBeCloseTo(
			LOGICAL_PROJECTILE_LENGTH * scale,
			6,
		)
	})
})

describe('campaign geometry after hotfix', () => {
	it('keeps requiredThrows from the balance hotfix', () => {
		expect(PRODUCTION_LEVELS[0]!.requiredThrows).toBe(11)
		expect(
			PRODUCTION_LEVELS.find((l) => l.displayNumber === 6)!.requiredThrows,
		).toBe(12)
		expect(
			PRODUCTION_LEVELS.find((l) => l.displayNumber === 15)!.requiredThrows,
		).toBe(16)
		expect(
			PRODUCTION_LEVELS.find((l) => l.displayNumber === 30)!.requiredThrows,
		).toBe(18)
	})

	it('uses the shared collision envelope on every campaign level', () => {
		for (const level of PRODUCTION_LEVELS) {
			expect(level.targetRadius).toBe(LOGICAL_TARGET_RADIUS)
			expect(level.projectileSize).toBe(LOGICAL_PROJECTILE_WIDTH)
		}
	})
})
