/**
 * Unit tests for pure angular math used by future collision detection.
 */

import {
	hasAngularCollisionWithAny,
	isAngularCollision,
	normalizeAngle,
	shortestAngularDistance,
} from '../../src/game/math/angles'

describe('normalizeAngle', () => {
	it('leaves angles already in [0, 360) unchanged', () => {
		expect(normalizeAngle(0)).toBe(0)
		expect(normalizeAngle(10)).toBe(10)
		expect(normalizeAngle(359)).toBe(359)
	})

	it('wraps values above 360', () => {
		expect(normalizeAngle(370)).toBe(10)
		expect(normalizeAngle(720)).toBe(0)
	})

	it('wraps negative angles into [0, 360)', () => {
		expect(normalizeAngle(-10)).toBe(350)
		expect(normalizeAngle(-370)).toBe(350)
	})
})

describe('shortestAngularDistance', () => {
	it('returns simple forward distance', () => {
		expect(shortestAngularDistance(10, 20)).toBe(10)
	})

	it('crosses the 0/360 boundary correctly', () => {
		expect(shortestAngularDistance(350, 10)).toBe(20)
		expect(shortestAngularDistance(10, 350)).toBe(20)
	})

	it('handles opposite angles', () => {
		expect(shortestAngularDistance(0, 180)).toBe(180)
	})
})

describe('isAngularCollision', () => {
	const threshold = 18

	it('detects a normal close collision', () => {
		expect(isAngularCollision(40, 50, threshold)).toBe(true)
	})

	it('detects collision across the 0/360 wrap', () => {
		expect(isAngularCollision(359, 1, threshold)).toBe(true)
		expect(isAngularCollision(350, 5, threshold)).toBe(true)
	})

	it('reports no collision when far enough apart', () => {
		expect(isAngularCollision(0, 90, threshold)).toBe(false)
		expect(isAngularCollision(350, 20, threshold)).toBe(false)
	})

	it('uses strict less-than for the threshold edge', () => {
		expect(isAngularCollision(0, 18, 18)).toBe(false)
		expect(isAngularCollision(0, 17.9, 18)).toBe(true)
	})
})

describe('hasAngularCollisionWithAny', () => {
	it('returns true when any occupied angle collides', () => {
		expect(
			hasAngularCollisionWithAny(5, [100, 350], 18),
		).toBe(true)
	})

	it('returns false when candidate is clear', () => {
		expect(
			hasAngularCollisionWithAny(90, [0, 180], 18),
		).toBe(false)
	})
})
