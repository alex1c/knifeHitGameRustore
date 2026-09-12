/**
 * Daily challenge — deterministic LevelConfig from local date key.
 */

import { validateLevelConfig } from '../game/config/validateLevel'
import {
	constantSegment,
	pauseSegment,
	rampSegment,
} from '../game/engine/timeline'
import type { LevelConfig, RotationSegment } from '../game/models'
import {
	createSeededRng,
	hashStringToSeed,
	seededInt,
	seededPick,
} from './dateKeys'

export interface DailyChallenge {
	dateKey: string
	seed: number
	level: LevelConfig
}

function buildCandidate (
	dateKey: string,
	seed: number,
	attempt: number,
): LevelConfig {
	const rng = createSeededRng((seed + attempt * 9973) >>> 0)
	const band = seededInt(rng, 0, 3)
	const requiredThrows = seededInt(rng, 5, 8)
	const speed = seededInt(rng, 36, 62)
	const cw = rng() < 0.5

	let segments: RotationSegment[]
	switch (band) {
		case 0:
			segments = [constantSegment(seededInt(rng, 3000, 4000), cw ? speed : -speed)]
			break
		case 1:
			segments = [
				rampSegment(
					seededInt(rng, 1600, 2200),
					cw ? speed - 10 : -(speed - 10),
					cw ? speed + 8 : -(speed + 8),
				),
				rampSegment(
					seededInt(rng, 1600, 2200),
					cw ? speed + 8 : -(speed + 8),
					cw ? speed - 10 : -(speed - 10),
				),
			]
			break
		case 2:
			segments = [
				constantSegment(seededInt(rng, 1400, 2000), cw ? speed : -speed),
				pauseSegment(seededInt(rng, 280, 520)),
				constantSegment(seededInt(rng, 1400, 2000), cw ? -speed : speed),
			]
			break
		default:
			segments = [
				rampSegment(seededInt(rng, 1200, 1600), speed - 8, speed + 10),
				pauseSegment(seededInt(rng, 220, 400)),
				constantSegment(seededInt(rng, 1100, 1500), -speed),
			]
			break
	}

	const obstacleSets: number[][] = [
		[],
		[0],
		[40, 210],
		[0, 150],
		[25, 160, 280],
	]
	const initialObstacles = seededPick(rng, obstacleSets)

	return {
		id: `daily-${dateKey}`,
		displayNumber: 1,
		requiredThrows,
		targetRadius: 100,
		projectileSize: 14,
		initialObstacles,
		segments,
	}
}

/**
 * Same date key always yields the same validated challenge.
 * Invalid candidates are retried with a deterministic attempt offset (no Math.random).
 */
export function generateDailyChallenge (dateKey: string): DailyChallenge {
	const seed = hashStringToSeed(`precision-throw-daily:${dateKey}`)
	for (let attempt = 0; attempt < 32; attempt += 1) {
		const level = buildCandidate(dateKey, seed, attempt)
		if (validateLevelConfig(level).ok) {
			return { dateKey, seed, level }
		}
	}
	// Guaranteed-valid last resort from the same seed family.
	const fallbackSpeed = 40 + (seed % 15)
	return {
		dateKey,
		seed,
		level: {
			id: `daily-${dateKey}`,
			displayNumber: 1,
			requiredThrows: 6,
			targetRadius: 100,
			projectileSize: 14,
			initialObstacles: seed % 2 === 0 ? [0] : [0, 180],
			segments: [
				constantSegment(3200, seed % 2 === 0 ? fallbackSpeed : -fallbackSpeed),
			],
		},
	}
}
