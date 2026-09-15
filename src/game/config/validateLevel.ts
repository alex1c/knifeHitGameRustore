/**
 * Static validation for level configs.
 * Guards against malformed / geometrically impossible configs.
 * Does NOT claim timing-game solvability.
 */

import {
	computeMinAngularSeparationDegrees,
} from '../engine/gameEngine'
import { isAngularCollision, normalizeAngle } from '../math/angles'
import type { LevelConfig, RotationSegment } from '../models/types'

export const LEVEL_LIMITS = {
	minRequiredThrows: 1,
	maxRequiredThrows: 20,
	minTargetRadius: 40,
	maxTargetRadius: 200,
	minProjectileSize: 6,
	maxProjectileSize: 28,
	minSegmentDurationMs: 120,
	maxSegmentDurationMs: 20_000,
	maxAbsSpeed: 140,
	maxSegments: 12,
	maxInitialObstacles: 8,
	minCycleDurationMs: 400,
} as const

/** Practical soft ceiling — leave readable gaps near the rim. */
export const SAFE_CAPACITY_FILL_RATIO = 0.75

export interface ValidationIssue {
	path: string
	message: string
}

export interface ValidationResult {
	ok: boolean
	issues: ValidationIssue[]
}

function issue (path: string, message: string): ValidationIssue {
	return { path, message }
}

function isFiniteNumber (value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value)
}

export function theoreticalCapacity (
	level: Pick<LevelConfig, 'targetRadius' | 'projectileSize'>,
): number {
	const separation = computeMinAngularSeparationDegrees(level as LevelConfig)
	if (separation <= 0) {
		return 0
	}
	return Math.floor(360 / separation)
}

function validateSegment (
	segment: RotationSegment,
	path: string,
): ValidationIssue[] {
	const issues: ValidationIssue[] = []
	if (!isFiniteNumber(segment.durationMs) || segment.durationMs <= 0) {
		issues.push(issue(path, 'durationMs must be a positive finite number'))
	} else if (segment.durationMs < LEVEL_LIMITS.minSegmentDurationMs) {
		issues.push(
			issue(
				path,
				`durationMs below minimum (${LEVEL_LIMITS.minSegmentDurationMs})`,
			),
		)
	} else if (segment.durationMs > LEVEL_LIMITS.maxSegmentDurationMs) {
		issues.push(
			issue(
				path,
				`durationMs above maximum (${LEVEL_LIMITS.maxSegmentDurationMs})`,
			),
		)
	}

	for (const key of ['startSpeed', 'endSpeed'] as const) {
		const speed = segment[key]
		if (!isFiniteNumber(speed)) {
			issues.push(issue(`${path}.${key}`, 'must be a finite number'))
		} else if (Math.abs(speed) > LEVEL_LIMITS.maxAbsSpeed) {
			issues.push(
				issue(
					`${path}.${key}`,
					`abs(speed) exceeds max ${LEVEL_LIMITS.maxAbsSpeed}`,
				),
			)
		}
	}
	return issues
}

export function validateLevelConfig (level: LevelConfig): ValidationResult {
	const issues: ValidationIssue[] = []

	if (!level.id || typeof level.id !== 'string') {
		issues.push(issue('id', 'id is required'))
	}
	if (!Number.isInteger(level.displayNumber) || level.displayNumber < 1) {
		issues.push(issue('displayNumber', 'must be an integer >= 1'))
	}
	if (
		!Number.isInteger(level.requiredThrows) ||
		level.requiredThrows < LEVEL_LIMITS.minRequiredThrows ||
		level.requiredThrows > LEVEL_LIMITS.maxRequiredThrows
	) {
		issues.push(
			issue(
				'requiredThrows',
				`must be an integer in [${LEVEL_LIMITS.minRequiredThrows}, ${LEVEL_LIMITS.maxRequiredThrows}]`,
			),
		)
	}
	if (
		!isFiniteNumber(level.targetRadius) ||
		level.targetRadius < LEVEL_LIMITS.minTargetRadius ||
		level.targetRadius > LEVEL_LIMITS.maxTargetRadius
	) {
		issues.push(issue('targetRadius', 'out of allowed range'))
	}
	if (
		!isFiniteNumber(level.projectileSize) ||
		level.projectileSize < LEVEL_LIMITS.minProjectileSize ||
		level.projectileSize > LEVEL_LIMITS.maxProjectileSize
	) {
		issues.push(issue('projectileSize', 'out of allowed range'))
	}

	if (!Array.isArray(level.segments) || level.segments.length === 0) {
		issues.push(issue('segments', 'timeline must contain at least one segment'))
	} else {
		if (level.segments.length > LEVEL_LIMITS.maxSegments) {
			issues.push(issue('segments', 'too many segments'))
		}
		let cycle = 0
		level.segments.forEach((segment, index) => {
			issues.push(...validateSegment(segment, `segments[${index}]`))
			if (isFiniteNumber(segment.durationMs)) {
				cycle += segment.durationMs
			}
		})
		if (cycle < LEVEL_LIMITS.minCycleDurationMs) {
			issues.push(issue('segments', 'cycle duration too short'))
		}
	}

	if (!Array.isArray(level.initialObstacles)) {
		issues.push(issue('initialObstacles', 'must be an array'))
	} else {
		if (level.initialObstacles.length > LEVEL_LIMITS.maxInitialObstacles) {
			issues.push(issue('initialObstacles', 'too many initial obstacles'))
		}
		const separation = computeMinAngularSeparationDegrees(level)
		level.initialObstacles.forEach((angle, index) => {
			if (!isFiniteNumber(angle)) {
				issues.push(
					issue(`initialObstacles[${index}]`, 'angle must be finite'),
				)
				return
			}
			const normalized = normalizeAngle(angle)
			for (let other = 0; other < index; other += 1) {
				const otherAngle = level.initialObstacles[other]
				if (!isFiniteNumber(otherAngle)) {
					continue
				}
				if (
					isAngularCollision(
						normalized,
						normalizeAngle(otherAngle),
						separation,
					)
				) {
					issues.push(
						issue(
							`initialObstacles[${index}]`,
							`overlaps initialObstacles[${other}]`,
						),
					)
				}
			}
		})

		const capacity = theoreticalCapacity(level)
		const demand = level.initialObstacles.length + level.requiredThrows
		if (demand > capacity) {
			issues.push(
				issue(
					'capacity',
					`obstacles (${level.initialObstacles.length}) + throws (${level.requiredThrows}) exceed theoretical capacity (${capacity})`,
				),
			)
		}
	}

	return { ok: issues.length === 0, issues }
}

export function validateLevelCollection (
	levels: readonly LevelConfig[],
): ValidationResult {
	const issues: ValidationIssue[] = []
	const seenIds = new Set<string>()
	const seenNumbers = new Set<number>()

	levels.forEach((level, index) => {
		const result = validateLevelConfig(level)
		for (const item of result.issues) {
			issues.push({
				path: `levels[${index}].${item.path}`,
				message: item.message,
			})
		}
		if (seenIds.has(level.id)) {
			issues.push({
				path: `levels[${index}].id`,
				message: `duplicate id "${level.id}"`,
			})
		}
		seenIds.add(level.id)
		if (seenNumbers.has(level.displayNumber)) {
			issues.push({
				path: `levels[${index}].displayNumber`,
				message: `duplicate displayNumber ${level.displayNumber}`,
			})
		}
		seenNumbers.add(level.displayNumber)
	})

	return { ok: issues.length === 0, issues }
}
