/**
 * Pure ad policy — interstitial + app-open eligibility (testable).
 */

import {
	APP_OPEN_SHOWS_ENABLED,
	INTERSTITIAL_MIN_INTERVAL_MS,
	INTERSTITIAL_MIN_MEANINGFUL_ACTIONS,
} from './config'

export interface AdSessionState {
	sessionStartedAt: number
	lastInterstitialAt: number | null
	lastRewardedAt: number | null
	meaningfulActionCount: number
	interstitialShownThisSession: boolean
	/** True while Campaign / Endless / Daily round is active. */
	activeGameplay: boolean
}

export function createAdSessionState (now: number = Date.now()): AdSessionState {
	return {
		sessionStartedAt: now,
		lastInterstitialAt: null,
		lastRewardedAt: null,
		meaningfulActionCount: 0,
		interstitialShownThisSession: false,
		activeGameplay: false,
	}
}

export function noteMeaningfulAction (state: AdSessionState): AdSessionState {
	return {
		...state,
		meaningfulActionCount: state.meaningfulActionCount + 1,
	}
}

export type InterstitialBlockReason =
	| 'active_gameplay'
	| 'first_launch_window'
	| 'cooldown'
	| 'actions'
	| 'session_cap'
	| 'after_rewarded'
	| null

export interface InterstitialDecision {
	allowed: boolean
	reason: InterstitialBlockReason
}

/**
 * ForestMusic interstitial policy:
 * - not during active gameplay
 * - not immediately after launch (< 5 min from session start unless actions also gate)
 * - min 5 minutes since last interstitial (and since session start for first)
 * - min 5 meaningful actions
 * - max 1 per session
 * - not immediately after rewarded
 */
export function canShowInterstitial (
	state: AdSessionState,
	now: number = Date.now(),
): InterstitialDecision {
	if (state.activeGameplay) {
		return { allowed: false, reason: 'active_gameplay' }
	}
	if (state.interstitialShownThisSession) {
		return { allowed: false, reason: 'session_cap' }
	}
	if (state.meaningfulActionCount < INTERSTITIAL_MIN_MEANINGFUL_ACTIONS) {
		return { allowed: false, reason: 'actions' }
	}
	const sinceStart = now - state.sessionStartedAt
	if (sinceStart < INTERSTITIAL_MIN_INTERVAL_MS) {
		return { allowed: false, reason: 'first_launch_window' }
	}
	if (
		state.lastInterstitialAt !== null &&
		now - state.lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS
	) {
		return { allowed: false, reason: 'cooldown' }
	}
	if (
		state.lastRewardedAt !== null &&
		now - state.lastRewardedAt < INTERSTITIAL_MIN_INTERVAL_MS
	) {
		return { allowed: false, reason: 'after_rewarded' }
	}
	return { allowed: true, reason: null }
}

export type AppOpenBlockReason =
	| 'disabled'
	| 'active_gameplay'
	| 'first_launch'
	| 'after_interstitial'
	| 'after_rewarded'
	| 'rapid_resume'
	| null

export interface AppOpenDecision {
	allowed: boolean
	reason: AppOpenBlockReason
}

const RAPID_RESUME_MS = 5_000

/**
 * Conservative App Open policy. Real shows may stay disabled for 1.0.
 */
export function canShowAppOpen (
	state: AdSessionState,
	options: {
		now?: number
		backgroundedAt?: number | null
		isFirstLaunch?: boolean
	} = {},
): AppOpenDecision {
	const now = options.now ?? Date.now()
	if (!APP_OPEN_SHOWS_ENABLED) {
		return { allowed: false, reason: 'disabled' }
	}
	if (state.activeGameplay) {
		return { allowed: false, reason: 'active_gameplay' }
	}
	if (options.isFirstLaunch) {
		return { allowed: false, reason: 'first_launch' }
	}
	if (
		state.lastInterstitialAt !== null &&
		now - state.lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS
	) {
		return { allowed: false, reason: 'after_interstitial' }
	}
	if (
		state.lastRewardedAt !== null &&
		now - state.lastRewardedAt < INTERSTITIAL_MIN_INTERVAL_MS
	) {
		return { allowed: false, reason: 'after_rewarded' }
	}
	if (
		options.backgroundedAt != null &&
		now - options.backgroundedAt < RAPID_RESUME_MS
	) {
		return { allowed: false, reason: 'rapid_resume' }
	}
	return { allowed: true, reason: null }
}
