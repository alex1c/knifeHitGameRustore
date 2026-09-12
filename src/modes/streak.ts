/**
 * Pure streak helpers for daily challenge completions.
 */

import {
	isConsecutiveDate,
	isValidDateKey,
} from './dateKeys'

export interface StreakState {
	currentStreak: number
	bestStreak: number
	lastCompletedDailyDate: string | null
}

/**
 * Applies a daily completion for `dateKey`.
 * Same-day repeat does not change streak. Gap resets to 1.
 */
export function applyDailyStreak (
	state: StreakState,
	dateKey: string,
): StreakState {
	if (!isValidDateKey(dateKey)) {
		return state
	}
	if (state.lastCompletedDailyDate === dateKey) {
		return state
	}

	let currentStreak = 1
	if (
		state.lastCompletedDailyDate &&
		isValidDateKey(state.lastCompletedDailyDate) &&
		isConsecutiveDate(state.lastCompletedDailyDate, dateKey)
	) {
		currentStreak = state.currentStreak + 1
	}

	return {
		currentStreak,
		bestStreak: Math.max(state.bestStreak, currentStreak),
		lastCompletedDailyDate: dateKey,
	}
}
