/**
 * Timeline / speed-ramp / pause / reversal tests.
 */

import {
	compileTimeline,
	constantSegment,
	integrateRampDegrees,
	pauseSegment,
	rampSegment,
	sampleCompiledTimeline,
	segmentTotalDegrees,
	targetRotationAtElapsed,
} from '../../src/game/engine'
import { normalizeAngle } from '../../src/game/math/angles'
import type { LevelConfig } from '../../src/game/models'
import { freezeElapsed, resumeRoundStart } from '../../src/game/engine/roundClock'

function levelWith (
	segments: LevelConfig['segments'],
): LevelConfig {
	return {
		id: 'test',
		displayNumber: 1,
		requiredThrows: 5,
		targetRadius: 100,
		projectileSize: 12,
		initialObstacles: [],
		segments,
	}
}

describe('integrateRampDegrees', () => {
	it('matches average-speed * time for a full ramp', () => {
		const degrees = integrateRampDegrees(30, 70, 3000, 3000)
		expect(degrees).toBeCloseTo(((30 + 70) / 2) * 3, 5)
	})

	it('returns 0 at t=0', () => {
		expect(integrateRampDegrees(40, 80, 2000, 0)).toBe(0)
	})
})

describe('targetRotationAtElapsed', () => {
	it('constant CW', () => {
		const level = levelWith([constantSegment(2000, 40)])
		expect(targetRotationAtElapsed(level, 1000).angle).toBeCloseTo(40, 5)
		expect(targetRotationAtElapsed(level, 1000).signedSpeed).toBe(40)
	})

	it('constant CCW', () => {
		const level = levelWith([constantSegment(2000, -50)])
		expect(targetRotationAtElapsed(level, 1000).angle).toBeCloseTo(
			normalizeAngle(-50),
			5,
		)
		expect(targetRotationAtElapsed(level, 1000).signedSpeed).toBe(-50)
	})

	it('pause keeps angle fixed and speed 0', () => {
		const level = levelWith([
			constantSegment(1000, 40),
			pauseSegment(500),
			constantSegment(1000, 40),
		])
		const atPauseStart = targetRotationAtElapsed(level, 1000)
		const midPause = targetRotationAtElapsed(level, 1250)
		expect(midPause.angle).toBeCloseTo(atPauseStart.angle, 5)
		expect(midPause.signedSpeed).toBe(0)
	})

	it('CW → CCW reversal is continuous at the boundary', () => {
		const level = levelWith([
			constantSegment(1000, 40),
			constantSegment(1000, -60),
		])
		const before = targetRotationAtElapsed(level, 999)
		const at = targetRotationAtElapsed(level, 1000)
		const after = targetRotationAtElapsed(level, 1001)
		expect(Math.abs(at.rawAngleDegrees - before.rawAngleDegrees)).toBeLessThan(0.1)
		expect(Math.abs(after.rawAngleDegrees - at.rawAngleDegrees)).toBeLessThan(0.1)
		expect(at.signedSpeed).toBe(-60)
	})

	it('CCW → CW reversal is continuous', () => {
		const level = levelWith([
			constantSegment(800, -45),
			constantSegment(800, 45),
		])
		const at = targetRotationAtElapsed(level, 800)
		const after = targetRotationAtElapsed(level, 801)
		expect(Math.abs(after.rawAngleDegrees - at.rawAngleDegrees)).toBeLessThan(0.1)
	})

	it('segment boundary continuity for ramp → pause', () => {
		const level = levelWith([
			rampSegment(1000, 20, 60),
			pauseSegment(400),
		])
		const endRamp = targetRotationAtElapsed(level, 1000)
		const startPause = targetRotationAtElapsed(level, 1000)
		expect(endRamp.rawAngleDegrees).toBeCloseTo(startPause.rawAngleDegrees, 8)
		expect(segmentTotalDegrees(rampSegment(1000, 20, 60))).toBeCloseTo(
			endRamp.rawAngleDegrees,
			5,
		)
	})

	it('loops with continuous angle across cycle boundary', () => {
		const level = levelWith([
			constantSegment(1000, 30),
			pauseSegment(200),
		])
		const compiled = compileTimeline(level.segments)
		const end = targetRotationAtElapsed(level, compiled.cycleDurationMs - 1)
		const looped = targetRotationAtElapsed(level, compiled.cycleDurationMs)
		const next = targetRotationAtElapsed(level, compiled.cycleDurationMs + 1)
		expect(Math.abs(looped.rawAngleDegrees - (end.rawAngleDegrees + 0.03))).toBeLessThan(1)
		expect(next.rawAngleDegrees).toBeGreaterThan(looped.rawAngleDegrees - 0.01)
		expect(looped.rawAngleDegrees).toBeCloseTo(compiled.anglePerCycle, 5)
	})

	it('speed ramp mid-point uses integrated angle not end speed * t', () => {
		const level = levelWith([rampSegment(2000, 20, 60)])
		const mid = targetRotationAtElapsed(level, 1000)
		const naiveEnd = 60 * 1
		const naiveStart = 20 * 1
		expect(mid.rawAngleDegrees).toBeGreaterThan(naiveStart)
		expect(mid.rawAngleDegrees).toBeLessThan(naiveEnd)
		expect(mid.rawAngleDegrees).toBeCloseTo(
			integrateRampDegrees(20, 60, 2000, 1000),
			5,
		)
	})

	it('normalizes angle wrap', () => {
		const level = levelWith([constantSegment(20_000, 90)])
		const sample = targetRotationAtElapsed(level, 5000)
		expect(sample.angle).toBeGreaterThanOrEqual(0)
		expect(sample.angle).toBeLessThan(360)
		expect(sample.angle).toBeCloseTo(normalizeAngle(90 * 5), 5)
	})

	it('handles very large elapsed time', () => {
		const level = levelWith([constantSegment(1000, 40), pauseSegment(250)])
		const sample = targetRotationAtElapsed(level, 1_000_000_000)
		expect(Number.isFinite(sample.angle)).toBe(true)
		expect(sample.angle).toBeGreaterThanOrEqual(0)
		expect(sample.angle).toBeLessThan(360)
	})

	it('elapsed = 0 returns zero angle', () => {
		const level = levelWith([constantSegment(1000, 50)])
		const sample = targetRotationAtElapsed(level, 0)
		expect(sample.angle).toBe(0)
		expect(sample.segmentIndex).toBe(0)
	})
})

describe('sampleCompiledTimeline continuity helper', () => {
	it('matches targetRotationAtElapsed', () => {
		const segments = [rampSegment(1500, 25, 55), pauseSegment(300)]
		const level = levelWith(segments)
		const compiled = compileTimeline(segments)
		const elapsed = 1600
		const a = targetRotationAtElapsed(level, elapsed)
		const b = sampleCompiledTimeline(
			elapsed,
			compiled.cycleDurationMs,
			compiled.anglePerCycle,
			compiled.segmentCount,
			compiled.durations,
			compiled.startSpeeds,
			compiled.endSpeeds,
			compiled.angleBeforeSegment,
		)
		expect(b.angle).toBeCloseTo(a.angle, 8)
	})
})

describe('round clock pause/resume', () => {
	it('freezes and resumes without angle jump in elapsed space', () => {
		const frozen = freezeElapsed(5000, 1000)
		expect(frozen).toBe(4000)
		const newStart = resumeRoundStart(9000, frozen)
		expect(9000 - newStart).toBe(4000)
	})
})
