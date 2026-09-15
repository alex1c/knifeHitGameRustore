/**
 * Production campaign: 30 deterministic levels.
 * Difficulty via target timeline behavior + balanced rim fill.
 *
 * Geometry (unchanged):
 * targetRadius=100, projectileSize=14, padding=3°
 * → minAngularSeparation ≈ 11.01°, theoretical capacity = 32.
 * Campaign fill targets stay well below ~75% capacity so late gaps stay readable.
 */

import type { LevelConfig, RotationSegment } from '../models/types'
import {
	constantSegment,
	pauseSegment,
	rampSegment,
} from '../engine/timeline'

const R = 100
const P = 14

function level (
	displayNumber: number,
	requiredThrows: number,
	segments: RotationSegment[],
	initialObstacles: number[] = [],
): LevelConfig {
	return {
		id: `level-${displayNumber}`,
		displayNumber,
		requiredThrows,
		targetRadius: R,
		projectileSize: P,
		initialObstacles,
		segments,
	}
}

/** Levels 1–5: intro constant rotation. Fill ~35–45%. */
const INTRO: LevelConfig[] = [
	level(1, 11, [constantSegment(4000, 32)], []),
	level(2, 10, [constantSegment(4000, -34)], [0]),
	level(3, 12, [constantSegment(3800, 40)], [0]),
	level(4, 12, [constantSegment(3600, -42)], [30, 200]),
	level(5, 13, [constantSegment(3400, 48)], [0, 160]),
]

/** Levels 6–10: speed ramps. Level 6 targets ~10–12 player throws. */
const SPEED: LevelConfig[] = [
	level(6, 12, [rampSegment(3500, 28, 55)], [0, 180]),
	level(7, 13, [rampSegment(3500, -55, -30)], [40, 210]),
	level(8, 14, [
		rampSegment(2000, 30, 58),
		rampSegment(2000, 58, 30),
	], [0, 175]),
	level(9, 14, [
		rampSegment(2200, -32, -60),
		rampSegment(2200, -60, -32),
	], [50, 230]),
	level(10, 15, [
		rampSegment(1800, 35, 62),
		rampSegment(1800, 62, 35),
		rampSegment(1800, 35, 50),
	], [20, 180]),
]

/** Levels 11–15: direction reversal. Fill ~50–60%. */
const REVERSAL: LevelConfig[] = [
	level(11, 14, [
		constantSegment(2200, 42),
		pauseSegment(400),
		constantSegment(2200, -42),
	], [0, 170]),
	level(12, 14, [
		constantSegment(2000, -46),
		pauseSegment(320),
		constantSegment(2000, 46),
	], [40, 200, 300]),
	level(13, 15, [
		constantSegment(1800, 50),
		pauseSegment(220),
		constantSegment(1800, -50),
		pauseSegment(220),
	], [0, 170]),
	level(14, 15, [
		rampSegment(1600, 36, 58),
		pauseSegment(280),
		rampSegment(1600, -36, -58),
	], [30, 140, 250]),
	level(15, 16, [
		constantSegment(1500, 55),
		constantSegment(1500, -55),
	], [0, 150, 260]),
]

/** Levels 16–20: pause / timing focus. Fill ~55–65%. */
const PAUSE: LevelConfig[] = [
	level(16, 16, [
		constantSegment(1600, 48),
		pauseSegment(700),
		constantSegment(1600, 48),
	], [20, 190]),
	level(17, 15, [
		constantSegment(1400, -52),
		pauseSegment(550),
		constantSegment(1400, -52),
		pauseSegment(400),
	], [0, 120, 230]),
	level(18, 16, [
		rampSegment(1400, 40, 60),
		pauseSegment(500),
		rampSegment(1400, 60, 40),
	], [45, 160, 280]),
	level(19, 16, [
		constantSegment(1200, 50),
		pauseSegment(450),
		constantSegment(1200, -50),
		pauseSegment(450),
	], [10, 130, 250]),
	level(20, 17, [
		rampSegment(1200, 42, 64),
		pauseSegment(380),
		rampSegment(1200, -42, -64),
		pauseSegment(380),
	], [0, 120, 240]),
]

/** Levels 21–25: combinations. Fill ~60–70%. */
const COMBO: LevelConfig[] = [
	level(21, 17, [
		rampSegment(1300, 38, 62),
		pauseSegment(300),
		constantSegment(1400, -55),
	], [25, 145, 265]),
	level(22, 17, [
		constantSegment(1100, 58),
		pauseSegment(260),
		rampSegment(1400, -40, -66),
		pauseSegment(260),
	], [0, 120, 230]),
	level(23, 16, [
		rampSegment(1100, 45, 68),
		constantSegment(900, 68),
		pauseSegment(240),
		constantSegment(1100, -58),
	], [35, 125, 215, 305]),
	level(24, 17, [
		constantSegment(1000, -60),
		pauseSegment(220),
		rampSegment(1200, 42, 70),
		pauseSegment(220),
		constantSegment(1000, -50),
	], [15, 105, 195, 285]),
	level(25, 17, [
		rampSegment(1000, 48, 72),
		pauseSegment(200),
		rampSegment(1000, -48, -72),
		pauseSegment(200),
		constantSegment(900, 55),
	], [0, 90, 180, 270]),
]

/** Levels 26–30: advanced but human-passable. Fill ~65–75%. */
const ADVANCED: LevelConfig[] = [
	level(26, 18, [
		rampSegment(900, 50, 78),
		pauseSegment(180),
		constantSegment(1000, -62),
		pauseSegment(180),
		rampSegment(900, 45, 70),
	], [30, 120, 210, 300]),
	level(27, 18, [
		constantSegment(850, 70),
		constantSegment(850, -70),
		pauseSegment(300),
		rampSegment(1000, 40, 65),
	], [10, 100, 190, 280]),
	level(28, 18, [
		rampSegment(800, -52, -80),
		pauseSegment(160),
		rampSegment(800, 52, 80),
		pauseSegment(160),
		constantSegment(900, -58),
	], [0, 90, 180, 270]),
	level(29, 17, [
		constantSegment(750, 74),
		pauseSegment(200),
		constantSegment(750, -74),
		pauseSegment(200),
		rampSegment(900, 48, 72),
	], [40, 110, 180, 250, 320]),
	level(30, 18, [
		rampSegment(750, 55, 82),
		pauseSegment(150),
		constantSegment(700, -72),
		pauseSegment(150),
		rampSegment(750, -55, -82),
		pauseSegment(150),
		constantSegment(700, 65),
	], [20, 90, 160, 230, 300]),
]

export const PRODUCTION_LEVELS: LevelConfig[] = [
	...INTRO,
	...SPEED,
	...REVERSAL,
	...PAUSE,
	...COMBO,
	...ADVANCED,
]

/** @deprecated Use PRODUCTION_LEVELS — alias kept for older imports. */
export const PROTOTYPE_LEVELS = PRODUCTION_LEVELS

export const DEFAULT_LEVEL: LevelConfig = PRODUCTION_LEVELS[0]!

export function getLevelById (id: string): LevelConfig {
	return PRODUCTION_LEVELS.find((entry) => entry.id === id) ?? DEFAULT_LEVEL
}

export function getLevelByNumber (displayNumber: number): LevelConfig | null {
	return (
		PRODUCTION_LEVELS.find((entry) => entry.displayNumber === displayNumber) ??
		null
	)
}

/** Returns the next campaign level id, or null after Level 30. */
export function getNextLevelId (currentId: string): string | null {
	const index = PRODUCTION_LEVELS.findIndex((entry) => entry.id === currentId)
	if (index < 0) {
		return null
	}
	const next = PRODUCTION_LEVELS[index + 1]
	return next ? next.id : null
}

export function getHighestUnlockedLevelId (
	highestUnlockedDisplayNumber: number,
): string {
	const level =
		getLevelByNumber(highestUnlockedDisplayNumber) ?? DEFAULT_LEVEL
	return level.id
}
