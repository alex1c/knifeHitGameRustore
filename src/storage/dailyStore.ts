/**
 * Versioned daily challenge persistence + streak.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import { applyDailyStreak } from '../modes/streak'
import { isValidDateKey, todayLocalDateKey } from '../modes/dateKeys'

export const DAILY_STORAGE_KEY = '@precision_throw/daily/v1'
export const DAILY_SCHEMA_VERSION = 1
export const MAX_RECENT_DAILY_KEYS = 90

export interface DailyPersisted {
	version: number
	currentStreak: number
	bestStreak: number
	lastCompletedDailyDate: string | null
	/** Bounded recent completion keys (newest last). */
	completedDailyDates: string[]
	attemptsByDate: Record<string, number>
}

export const DEFAULT_DAILY: DailyPersisted = {
	version: DAILY_SCHEMA_VERSION,
	currentStreak: 0,
	bestStreak: 0,
	lastCompletedDailyDate: null,
	completedDailyDates: [],
	attemptsByDate: {},
}

function sanitizeKeyList (values: unknown): string[] {
	if (!Array.isArray(values)) {
		return []
	}
	const unique: string[] = []
	const seen = new Set<string>()
	for (const value of values) {
		if (!isValidDateKey(value) || seen.has(value)) {
			continue
		}
		seen.add(value)
		unique.push(value)
	}
	return unique.slice(-MAX_RECENT_DAILY_KEYS)
}

function sanitizeAttempts (raw: unknown): Record<string, number> {
	if (!raw || typeof raw !== 'object') {
		return {}
	}
	const out: Record<string, number> = {}
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		if (!isValidDateKey(key)) {
			continue
		}
		if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
			out[key] = Math.floor(value)
		}
	}
	return out
}

export function sanitizeDaily (raw: unknown): DailyPersisted {
	if (!raw || typeof raw !== 'object') {
		return { ...DEFAULT_DAILY, completedDailyDates: [], attemptsByDate: {} }
	}
	const record = raw as Record<string, unknown>
	const last =
		typeof record.lastCompletedDailyDate === 'string' &&
		isValidDateKey(record.lastCompletedDailyDate)
			? record.lastCompletedDailyDate
			: null
	const currentStreak =
		typeof record.currentStreak === 'number' &&
		Number.isFinite(record.currentStreak)
			? Math.max(0, Math.floor(record.currentStreak))
			: 0
	const bestStreak =
		typeof record.bestStreak === 'number' && Number.isFinite(record.bestStreak)
			? Math.max(0, Math.floor(record.bestStreak))
			: 0
	return {
		version: DAILY_SCHEMA_VERSION,
		currentStreak,
		bestStreak: Math.max(bestStreak, currentStreak),
		lastCompletedDailyDate: last,
		completedDailyDates: sanitizeKeyList(record.completedDailyDates),
		attemptsByDate: sanitizeAttempts(record.attemptsByDate),
	}
}

export async function loadDaily (): Promise<DailyPersisted> {
	try {
		const raw = await AsyncStorage.getItem(DAILY_STORAGE_KEY)
		if (!raw) {
			return {
				...DEFAULT_DAILY,
				completedDailyDates: [],
				attemptsByDate: {},
			}
		}
		return sanitizeDaily(JSON.parse(raw))
	} catch {
		return {
			...DEFAULT_DAILY,
			completedDailyDates: [],
			attemptsByDate: {},
		}
	}
}

export async function saveDaily (
	state: DailyPersisted,
): Promise<DailyPersisted> {
	const sanitized = sanitizeDaily(state)
	try {
		await AsyncStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(sanitized))
	} catch {
		// ignore
	}
	return sanitized
}

export function isDailyCompletedOn (
	state: DailyPersisted,
	dateKey: string,
): boolean {
	return state.completedDailyDates.includes(dateKey)
}

export function recordDailyAttempt (
	state: DailyPersisted,
	dateKey: string,
): DailyPersisted {
	if (!isValidDateKey(dateKey)) {
		return state
	}
	const attemptsByDate = { ...state.attemptsByDate }
	attemptsByDate[dateKey] = (attemptsByDate[dateKey] ?? 0) + 1
	return sanitizeDaily({ ...state, attemptsByDate })
}

export function recordDailyCompletion (
	state: DailyPersisted,
	dateKey: string,
): DailyPersisted {
	if (!isValidDateKey(dateKey)) {
		return state
	}
	if (state.completedDailyDates.includes(dateKey)) {
		return state
	}
	const streak = applyDailyStreak(
		{
			currentStreak: state.currentStreak,
			bestStreak: state.bestStreak,
			lastCompletedDailyDate: state.lastCompletedDailyDate,
		},
		dateKey,
	)
	const completedDailyDates = sanitizeKeyList([
		...state.completedDailyDates,
		dateKey,
	])
	return sanitizeDaily({
		...state,
		...streak,
		completedDailyDates,
	})
}

export function resolveActiveDailyDateKey (
	overrideDateKey: string | null | undefined,
	now: Date = new Date(),
): string {
	if (overrideDateKey && isValidDateKey(overrideDateKey)) {
		return overrideDateKey
	}
	return todayLocalDateKey(now)
}
