/**
 * Versioned aggregate statistics for all modes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import { isValidDateKey } from '../modes/dateKeys'

export const STATS_STORAGE_KEY = '@precision_throw/stats/v1'
export const STATS_SCHEMA_VERSION = 1

export interface StatsPersisted {
	version: number
	totalThrows: number
	successfulHits: number
	collisions: number
	endlessRuns: number
	bestEndlessScore: number
	dailyCompletedCount: number
	currentStreak: number
	bestStreak: number
	lastDailyCompletedDate: string | null
	campaignLevelsCompleted: number
}

export const DEFAULT_STATS: StatsPersisted = {
	version: STATS_SCHEMA_VERSION,
	totalThrows: 0,
	successfulHits: 0,
	collisions: 0,
	endlessRuns: 0,
	bestEndlessScore: 0,
	dailyCompletedCount: 0,
	currentStreak: 0,
	bestStreak: 0,
	lastDailyCompletedDate: null,
	campaignLevelsCompleted: 0,
}

function nonNegInt (value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 0
	}
	return Math.max(0, Math.floor(value))
}

export function sanitizeStats (raw: unknown): StatsPersisted {
	if (!raw || typeof raw !== 'object') {
		return { ...DEFAULT_STATS }
	}
	const record = raw as Record<string, unknown>
	return {
		version: STATS_SCHEMA_VERSION,
		totalThrows: nonNegInt(record.totalThrows),
		successfulHits: nonNegInt(record.successfulHits),
		collisions: nonNegInt(record.collisions),
		endlessRuns: nonNegInt(record.endlessRuns),
		bestEndlessScore: nonNegInt(record.bestEndlessScore),
		dailyCompletedCount: nonNegInt(record.dailyCompletedCount),
		currentStreak: nonNegInt(record.currentStreak),
		bestStreak: nonNegInt(record.bestStreak),
		lastDailyCompletedDate:
			typeof record.lastDailyCompletedDate === 'string' &&
			isValidDateKey(record.lastDailyCompletedDate)
				? record.lastDailyCompletedDate
				: null,
		campaignLevelsCompleted: nonNegInt(record.campaignLevelsCompleted),
	}
}

export async function loadStats (): Promise<StatsPersisted> {
	try {
		const raw = await AsyncStorage.getItem(STATS_STORAGE_KEY)
		if (!raw) {
			return { ...DEFAULT_STATS }
		}
		return sanitizeStats(JSON.parse(raw))
	} catch {
		return { ...DEFAULT_STATS }
	}
}

export async function saveStats (
	state: StatsPersisted,
): Promise<StatsPersisted> {
	const sanitized = sanitizeStats(state)
	try {
		await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(sanitized))
	} catch {
		// ignore
	}
	return sanitized
}

export function recordThrowStarted (state: StatsPersisted): StatsPersisted {
	return sanitizeStats({
		...state,
		totalThrows: state.totalThrows + 1,
	})
}

export function recordSuccessfulHit (state: StatsPersisted): StatsPersisted {
	return sanitizeStats({
		...state,
		successfulHits: state.successfulHits + 1,
	})
}

export function recordCollision (state: StatsPersisted): StatsPersisted {
	return sanitizeStats({
		...state,
		collisions: state.collisions + 1,
	})
}

export function recordEndlessRunEnd (
	state: StatsPersisted,
	score: number,
): StatsPersisted {
	return sanitizeStats({
		...state,
		endlessRuns: state.endlessRuns + 1,
		bestEndlessScore: Math.max(state.bestEndlessScore, Math.floor(score)),
	})
}

export function recordDailyCompletedStat (
	state: StatsPersisted,
	dateKey: string,
	currentStreak: number,
	bestStreak: number,
	alreadyCounted: boolean,
): StatsPersisted {
	return sanitizeStats({
		...state,
		dailyCompletedCount: alreadyCounted
			? state.dailyCompletedCount
			: state.dailyCompletedCount + 1,
		currentStreak,
		bestStreak,
		lastDailyCompletedDate: dateKey,
	})
}

export function recordCampaignLevelCompleted (
	state: StatsPersisted,
	completedCount: number,
): StatsPersisted {
	return sanitizeStats({
		...state,
		campaignLevelsCompleted: Math.max(
			state.campaignLevelsCompleted,
			completedCount,
		),
	})
}
