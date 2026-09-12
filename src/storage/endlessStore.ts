/**
 * Versioned endless persistence (best score + run count).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

export const ENDLESS_STORAGE_KEY = '@precision_throw/endless/v1'
export const ENDLESS_SCHEMA_VERSION = 1

export interface EndlessPersisted {
	version: number
	bestScore: number
	runsPlayed: number
}

export const DEFAULT_ENDLESS: EndlessPersisted = {
	version: ENDLESS_SCHEMA_VERSION,
	bestScore: 0,
	runsPlayed: 0,
}

export function sanitizeEndless (raw: unknown): EndlessPersisted {
	if (!raw || typeof raw !== 'object') {
		return { ...DEFAULT_ENDLESS }
	}
	const record = raw as Record<string, unknown>
	const bestScore =
		typeof record.bestScore === 'number' && Number.isFinite(record.bestScore)
			? Math.max(0, Math.floor(record.bestScore))
			: 0
	const runsPlayed =
		typeof record.runsPlayed === 'number' && Number.isFinite(record.runsPlayed)
			? Math.max(0, Math.floor(record.runsPlayed))
			: 0
	return {
		version: ENDLESS_SCHEMA_VERSION,
		bestScore,
		runsPlayed,
	}
}

export async function loadEndless (): Promise<EndlessPersisted> {
	try {
		const raw = await AsyncStorage.getItem(ENDLESS_STORAGE_KEY)
		if (!raw) {
			return { ...DEFAULT_ENDLESS }
		}
		return sanitizeEndless(JSON.parse(raw))
	} catch {
		return { ...DEFAULT_ENDLESS }
	}
}

export async function saveEndless (
	state: EndlessPersisted,
): Promise<EndlessPersisted> {
	const sanitized = sanitizeEndless(state)
	try {
		await AsyncStorage.setItem(ENDLESS_STORAGE_KEY, JSON.stringify(sanitized))
	} catch {
		// ignore
	}
	return sanitized
}

export function applyEndlessRunEnd (
	state: EndlessPersisted,
	score: number,
): EndlessPersisted {
	const safeScore = Math.max(0, Math.floor(score))
	return sanitizeEndless({
		...state,
		runsPlayed: state.runsPlayed + 1,
		bestScore: Math.max(state.bestScore, safeScore),
	})
}
