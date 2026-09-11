/**
 * Versioned local campaign progression.
 * Malformed storage falls back to Level 1 unlocked — never crashes startup.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import {
	DEFAULT_LEVEL,
	getLevelByNumber,
	PRODUCTION_LEVELS,
} from '../game/config/levels'

export const PROGRESSION_STORAGE_KEY = '@precision_throw/progression/v1'
export const PROGRESSION_SCHEMA_VERSION = 1

export interface ProgressionState {
	version: number
	/** Highest campaign level number the player may open (1–30). */
	highestUnlockedLevel: number
	/** Display numbers of completed levels. */
	completedLevels: number[]
}

export const DEFAULT_PROGRESSION: ProgressionState = {
	version: PROGRESSION_SCHEMA_VERSION,
	highestUnlockedLevel: 1,
	completedLevels: [],
}

function clampUnlocked (value: number): number {
	if (!Number.isFinite(value) || value < 1) {
		return 1
	}
	return Math.min(Math.floor(value), PRODUCTION_LEVELS.length)
}

function sanitizeCompleted (values: unknown, unlocked: number): number[] {
	if (!Array.isArray(values)) {
		return []
	}
	const set = new Set<number>()
	for (const entry of values) {
		if (typeof entry !== 'number' || !Number.isInteger(entry)) {
			continue
		}
		if (entry >= 1 && entry <= PRODUCTION_LEVELS.length && entry <= unlocked) {
			set.add(entry)
		}
	}
	return [...set].sort((a, b) => a - b)
}

/** Pure sanitize used by storage load and tests. */
export function sanitizeProgression (raw: unknown): ProgressionState {
	if (!raw || typeof raw !== 'object') {
		return { ...DEFAULT_PROGRESSION, completedLevels: [] }
	}
	const record = raw as Record<string, unknown>
	const unlocked = clampUnlocked(
		typeof record.highestUnlockedLevel === 'number'
			? record.highestUnlockedLevel
			: 1,
	)
	return {
		version: PROGRESSION_SCHEMA_VERSION,
		highestUnlockedLevel: unlocked,
		completedLevels: sanitizeCompleted(record.completedLevels, unlocked),
	}
}

export async function loadProgression (): Promise<ProgressionState> {
	try {
		const raw = await AsyncStorage.getItem(PROGRESSION_STORAGE_KEY)
		if (!raw) {
			return { ...DEFAULT_PROGRESSION, completedLevels: [] }
		}
		return sanitizeProgression(JSON.parse(raw))
	} catch {
		return { ...DEFAULT_PROGRESSION, completedLevels: [] }
	}
}

export async function saveProgression (
	state: ProgressionState,
): Promise<ProgressionState> {
	const sanitized = sanitizeProgression(state)
	try {
		await AsyncStorage.setItem(
			PROGRESSION_STORAGE_KEY,
			JSON.stringify(sanitized),
		)
	} catch {
		// Persistence failure must not crash gameplay.
	}
	return sanitized
}

/**
 * Monotonic unlock after winning a level.
 * Replay of older levels never decreases highestUnlockedLevel.
 */
export function applyLevelCompleted (
	state: ProgressionState,
	completedDisplayNumber: number,
): ProgressionState {
	const level = getLevelByNumber(completedDisplayNumber)
	if (!level) {
		return sanitizeProgression(state)
	}

	const completed = new Set(state.completedLevels)
	completed.add(level.displayNumber)

	let highest = state.highestUnlockedLevel
	if (level.displayNumber >= highest) {
		highest = Math.min(level.displayNumber + 1, PRODUCTION_LEVELS.length)
		// Completing the last level keeps unlock at 30.
		if (level.displayNumber === PRODUCTION_LEVELS.length) {
			highest = PRODUCTION_LEVELS.length
		}
	}

	return sanitizeProgression({
		version: PROGRESSION_SCHEMA_VERSION,
		highestUnlockedLevel: highest,
		completedLevels: [...completed],
	})
}

export function isLevelUnlocked (
	state: ProgressionState,
	displayNumber: number,
): boolean {
	return displayNumber >= 1 && displayNumber <= state.highestUnlockedLevel
}

export function isLevelCompleted (
	state: ProgressionState,
	displayNumber: number,
): boolean {
	return state.completedLevels.includes(displayNumber)
}

export function getContinueLevelId (state: ProgressionState): string {
	const level =
		getLevelByNumber(state.highestUnlockedLevel) ?? DEFAULT_LEVEL
	return level.id
}

/** DEV-only helper: unlock the full campaign for QA. */
export function unlockAllLevelsForQa (): ProgressionState {
	return {
		version: PROGRESSION_SCHEMA_VERSION,
		highestUnlockedLevel: PRODUCTION_LEVELS.length,
		completedLevels: PRODUCTION_LEVELS.map((level) => level.displayNumber),
	}
}

export function resetProgressionForQa (): ProgressionState {
	return { ...DEFAULT_PROGRESSION, completedLevels: [] }
}
