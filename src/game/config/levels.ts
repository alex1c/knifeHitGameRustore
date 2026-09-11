/**
 * Production campaign: 30 deterministic levels.
 * Difficulty via target timeline behavior only — no RNG.
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

/** Levels 1–5: intro constant rotation. */
const INTRO: LevelConfig[] = [
	level(1, 5, [constantSegment(4000, 32)], []),
	level(2, 5, [constantSegment(4000, -34)], [0]),
	level(3, 6, [constantSegment(3800, 40)], [0]),
	level(4, 6, [constantSegment(3600, -42)], [30, 200]),
	level(5, 7, [constantSegment(3400, 48)], [0, 160]),
]

/** Levels 6–10: speed ramps. */
const SPEED: LevelConfig[] = [
	level(6, 6, [rampSegment(3500, 28, 55)], [0]),
	level(7, 6, [rampSegment(3500, -55, -30)], [40, 210]),
	level(8, 7, [
		rampSegment(2000, 30, 58),
		rampSegment(2000, 58, 30),
	], [0]),
	level(9, 7, [
		rampSegment(2200, -32, -60),
		rampSegment(2200, -60, -32),
	], [50, 230]),
	level(10, 7, [
		rampSegment(1800, 35, 62),
		rampSegment(1800, 62, 35),
		rampSegment(1800, 35, 50),
	], [20, 180]),
]

/** Levels 11–15: direction reversal. */
const REVERSAL: LevelConfig[] = [
	level(11, 6, [
		constantSegment(2200, 42),
		pauseSegment(400),
		constantSegment(2200, -42),
	], [0]),
	level(12, 7, [
		constantSegment(2000, -46),
		pauseSegment(320),
		constantSegment(2000, 46),
	], [40, 200]),
	level(13, 7, [
		constantSegment(1800, 50),
		pauseSegment(220),
		constantSegment(1800, -50),
		pauseSegment(220),
	], [0, 170]),
	level(14, 7, [
		rampSegment(1600, 36, 58),
		pauseSegment(280),
		rampSegment(1600, -36, -58),
	], [30, 210]),
	level(15, 8, [
		constantSegment(1500, 55),
		constantSegment(1500, -55),
	], [0, 150, 260]),
]

/** Levels 16–20: pause / timing focus. */
const PAUSE: LevelConfig[] = [
	level(16, 7, [
		constantSegment(1600, 48),
		pauseSegment(700),
		constantSegment(1600, 48),
	], [20, 190]),
	level(17, 7, [
		constantSegment(1400, -52),
		pauseSegment(550),
		constantSegment(1400, -52),
		pauseSegment(400),
	], [0, 160]),
	level(18, 8, [
		rampSegment(1400, 40, 60),
		pauseSegment(500),
		rampSegment(1400, 60, 40),
	], [45, 200]),
	level(19, 8, [
		constantSegment(1200, 50),
		pauseSegment(450),
		constantSegment(1200, -50),
		pauseSegment(450),
	], [10, 130, 250]),
	level(20, 8, [
		rampSegment(1200, 42, 64),
		pauseSegment(380),
		rampSegment(1200, -42, -64),
		pauseSegment(380),
	], [0, 170]),
]

/** Levels 21–25: combinations. */
const COMBO: LevelConfig[] = [
	level(21, 8, [
		rampSegment(1300, 38, 62),
		pauseSegment(300),
		constantSegment(1400, -55),
	], [25, 145, 265]),
	level(22, 8, [
		constantSegment(1100, 58),
		pauseSegment(260),
		rampSegment(1400, -40, -66),
		pauseSegment(260),
	], [0, 160]),
	level(23, 8, [
		rampSegment(1100, 45, 68),
		constantSegment(900, 68),
		pauseSegment(240),
		constantSegment(1100, -58),
	], [35, 185, 290]),
	level(24, 9, [
		constantSegment(1000, -60),
		pauseSegment(220),
		rampSegment(1200, 42, 70),
		pauseSegment(220),
		constantSegment(1000, -50),
	], [15, 140, 255]),
	level(25, 9, [
		rampSegment(1000, 48, 72),
		pauseSegment(200),
		rampSegment(1000, -48, -72),
		pauseSegment(200),
		constantSegment(900, 55),
	], [0, 120, 230]),
]

/** Levels 26–30: advanced but human-passable. */
const ADVANCED: LevelConfig[] = [
	level(26, 9, [
		rampSegment(900, 50, 78),
		pauseSegment(180),
		constantSegment(1000, -62),
		pauseSegment(180),
		rampSegment(900, 45, 70),
	], [30, 150, 270]),
	level(27, 9, [
		constantSegment(850, 70),
		constantSegment(850, -70),
		pauseSegment(300),
		rampSegment(1000, 40, 65),
	], [10, 130, 250]),
	level(28, 9, [
		rampSegment(800, -52, -80),
		pauseSegment(160),
		rampSegment(800, 52, 80),
		pauseSegment(160),
		constantSegment(900, -58),
	], [0, 110, 220]),
	level(29, 10, [
		constantSegment(750, 74),
		pauseSegment(200),
		constantSegment(750, -74),
		pauseSegment(200),
		rampSegment(900, 48, 72),
	], [40, 160, 280]),
	level(30, 10, [
		rampSegment(750, 55, 82),
		pauseSegment(150),
		constantSegment(700, -72),
		pauseSegment(150),
		rampSegment(750, -55, -82),
		pauseSegment(150),
		constantSegment(700, 65),
	], [20, 140, 260]),
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
