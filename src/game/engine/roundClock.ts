/**
 * Pure helpers for freezing / resuming authoritative elapsed time.
 * Used by AppState pause so background time does not advance the target.
 */

export function freezeElapsed (
	clockMs: number,
	roundStartClockMs: number,
): number {
	return Math.max(0, clockMs - roundStartClockMs)
}

/**
 * Rebases roundStart so that (clock - roundStart) equals frozenElapsed.
 */
export function resumeRoundStart (
	clockMs: number,
	frozenElapsedMs: number,
): number {
	return clockMs - Math.max(0, frozenElapsedMs)
}
