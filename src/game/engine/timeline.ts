/**
 * Deterministic looping rotation timeline.
 *
 * Angle at any elapsedMs is a pure function of the compiled level segments:
 * full cycles × anglePerCycle + integral within the current cycle.
 * Linear speed ramps integrate as: v0*t + (v1-v0)*t²/(2T).
 */

import type { LevelConfig, RotationSegment, TimelineSample } from '../models/types'
import { normalizeAngle } from '../math/angles'

/** Flat numeric timeline for cheap sampling (engine + Skia worklets). */
export interface CompiledTimeline {
	cycleDurationMs: number
	anglePerCycle: number
	segmentCount: number
	durations: number[]
	startSpeeds: number[]
	endSpeeds: number[]
	/** Cumulative raw angle (degrees) at the start of each segment in one cycle. */
	angleBeforeSegment: number[]
}

/**
 * Degrees rotated during [0, tMs] of a linear speed ramp.
 * Speeds are deg/s; duration and t are milliseconds.
 */
export function integrateRampDegrees (
	startSpeed: number,
	endSpeed: number,
	durationMs: number,
	tMs: number,
): number {
	'worklet'
	if (durationMs <= 0 || tMs <= 0) {
		return 0
	}
	const clampedT = Math.min(tMs, durationMs)
	const tSec = clampedT / 1000
	const durationSec = durationMs / 1000
	const deltaV = endSpeed - startSpeed
	return startSpeed * tSec + (deltaV * tSec * tSec) / (2 * durationSec)
}

/** Full-segment angle contribution in degrees. */
export function segmentTotalDegrees (segment: RotationSegment): number {
	return integrateRampDegrees(
		segment.startSpeed,
		segment.endSpeed,
		segment.durationMs,
		segment.durationMs,
	)
}

export function compileTimeline (
	segments: readonly RotationSegment[],
): CompiledTimeline {
	const durations: number[] = []
	const startSpeeds: number[] = []
	const endSpeeds: number[] = []
	const angleBeforeSegment: number[] = []
	let cycleDurationMs = 0
	let anglePerCycle = 0

	for (const segment of segments) {
		angleBeforeSegment.push(anglePerCycle)
		durations.push(segment.durationMs)
		startSpeeds.push(segment.startSpeed)
		endSpeeds.push(segment.endSpeed)
		cycleDurationMs += segment.durationMs
		anglePerCycle += segmentTotalDegrees(segment)
	}

	return {
		cycleDurationMs,
		anglePerCycle,
		segmentCount: segments.length,
		durations,
		startSpeeds,
		endSpeeds,
		angleBeforeSegment,
	}
}

export function compileLevelTimeline (level: LevelConfig): CompiledTimeline {
	return compileTimeline(level.segments)
}

/**
 * Worklet-safe sampler used by Skia rendering and (via wrapper) by the engine.
 * Must stay free of closures over non-shareable objects.
 */
export function sampleCompiledTimeline (
	elapsedMs: number,
	cycleDurationMs: number,
	anglePerCycle: number,
	segmentCount: number,
	durations: number[],
	startSpeeds: number[],
	endSpeeds: number[],
	angleBeforeSegment: number[],
): TimelineSample {
	'worklet'

	const safeElapsed = elapsedMs > 0 ? elapsedMs : 0
	if (cycleDurationMs <= 0 || segmentCount <= 0) {
		return {
			rawAngleDegrees: 0,
			angle: 0,
			signedSpeed: 0,
			segmentIndex: 0,
			cycleElapsedMs: 0,
		}
	}

	const cycles = Math.floor(safeElapsed / cycleDurationMs)
	let cycleElapsedMs = safeElapsed - cycles * cycleDurationMs
	// Guard float residue landing exactly on cycle end.
	if (cycleElapsedMs >= cycleDurationMs) {
		cycleElapsedMs = 0
	}

	let rawAngleDegrees = cycles * anglePerCycle
	let segmentIndex = 0
	let cursor = 0

	for (let i = 0; i < segmentCount; i += 1) {
		const duration = durations[i]!
		const startSpeed = startSpeeds[i]!
		const endSpeed = endSpeeds[i]!
		const segmentStart = cursor
		const segmentEnd = cursor + duration

		if (cycleElapsedMs < segmentEnd || i === segmentCount - 1) {
			const tInSegment = Math.max(0, cycleElapsedMs - segmentStart)
			rawAngleDegrees += angleBeforeSegment[i]!
			rawAngleDegrees += integrateRampDegrees(
				startSpeed,
				endSpeed,
				duration,
				tInSegment,
			)
			segmentIndex = i
			const signedSpeed =
				duration <= 0
					? startSpeed
					: startSpeed + ((endSpeed - startSpeed) * tInSegment) / duration
			return {
				rawAngleDegrees,
				angle: normalizeAngle(rawAngleDegrees),
				signedSpeed,
				segmentIndex,
				cycleElapsedMs,
			}
		}
		cursor = segmentEnd
	}

	return {
		rawAngleDegrees,
		angle: normalizeAngle(rawAngleDegrees),
		signedSpeed: 0,
		segmentIndex: Math.max(0, segmentCount - 1),
		cycleElapsedMs,
	}
}

/**
 * Engine-facing sampler: compiles on demand (tests / infrequent calls).
 * Prefer compileLevelTimeline + sampleCompiledTimeline in hot paths.
 */
export function targetRotationAtElapsed (
	level: LevelConfig,
	elapsedMs: number,
): TimelineSample {
	const compiled = compileLevelTimeline(level)
	return sampleCompiledTimeline(
		elapsedMs,
		compiled.cycleDurationMs,
		compiled.anglePerCycle,
		compiled.segmentCount,
		compiled.durations,
		compiled.startSpeeds,
		compiled.endSpeeds,
		compiled.angleBeforeSegment,
	)
}

/** Convenience helpers for building level segments. */
export function constantSegment (
	durationMs: number,
	signedSpeed: number,
): RotationSegment {
	return { durationMs, startSpeed: signedSpeed, endSpeed: signedSpeed }
}

export function rampSegment (
	durationMs: number,
	startSpeed: number,
	endSpeed: number,
): RotationSegment {
	return { durationMs, startSpeed, endSpeed }
}

export function pauseSegment (durationMs: number): RotationSegment {
	return { durationMs, startSpeed: 0, endSpeed: 0 }
}
