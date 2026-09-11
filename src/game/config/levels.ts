/**
 * Prototype level catalogue for Phase 1 navigation and Game HUD.
 */

import type { LevelConfig } from '../models/types'

export const PROTOTYPE_LEVELS: LevelConfig[] = [
	{
		id: 'level-1',
		displayNumber: 1,
		requiredThrows: 5,
		initialSpeed: 40,
		direction: 'clockwise',
		targetRadius: 100,
		projectileSize: 12,
		initialObstacles: [0, 120],
	},
	{
		id: 'level-2',
		displayNumber: 2,
		requiredThrows: 6,
		initialSpeed: 55,
		direction: 'counterClockwise',
		targetRadius: 100,
		projectileSize: 12,
		initialObstacles: [30, 150, 270],
	},
	{
		id: 'level-3',
		displayNumber: 3,
		requiredThrows: 7,
		initialSpeed: 70,
		direction: 'clockwise',
		targetRadius: 100,
		projectileSize: 11,
		initialObstacles: [45, 135, 225, 315],
	},
]

export const DEFAULT_LEVEL: LevelConfig = PROTOTYPE_LEVELS[0]!

export function getLevelById (id: string): LevelConfig {
	return PROTOTYPE_LEVELS.find((level) => level.id === id) ?? DEFAULT_LEVEL
}
