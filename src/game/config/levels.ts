/**
 * Playable prototype levels for Phase 2 core loop.
 * Difficulty only via speed, direction, obstacles, and throw count.
 */

import type { LevelConfig } from '../models/types'

export const PROTOTYPE_LEVELS: LevelConfig[] = [
	{
		id: 'level-1',
		displayNumber: 1,
		requiredThrows: 5,
		initialSpeed: 36,
		direction: 'clockwise',
		targetRadius: 100,
		projectileSize: 14,
		// One obstacle — easy gaps
		initialObstacles: [0],
	},
	{
		id: 'level-2',
		displayNumber: 2,
		requiredThrows: 6,
		initialSpeed: 52,
		direction: 'counterClockwise',
		targetRadius: 100,
		projectileSize: 14,
		initialObstacles: [40, 200],
	},
	{
		id: 'level-3',
		displayNumber: 3,
		requiredThrows: 7,
		initialSpeed: 68,
		direction: 'clockwise',
		targetRadius: 100,
		projectileSize: 14,
		initialObstacles: [20, 140, 260],
	},
]

export const DEFAULT_LEVEL: LevelConfig = PROTOTYPE_LEVELS[0]!

export function getLevelById (id: string): LevelConfig {
	return PROTOTYPE_LEVELS.find((level) => level.id === id) ?? DEFAULT_LEVEL
}

/** Returns the next prototype level, or null after the last one. */
export function getNextLevelId (currentId: string): string | null {
	const index = PROTOTYPE_LEVELS.findIndex((level) => level.id === currentId)
	if (index < 0) {
		return null
	}
	const next = PROTOTYPE_LEVELS[index + 1]
	return next ? next.id : null
}
