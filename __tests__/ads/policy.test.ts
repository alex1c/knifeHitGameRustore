/**
 * Interstitial / App Open policy tests (ForestMusic gates).
 */

import {
	APP_OPEN_SHOWS_ENABLED,
	INTERSTITIAL_MIN_INTERVAL_MS,
	INTERSTITIAL_MIN_MEANINGFUL_ACTIONS,
} from '../../src/ads/config'
import {
	canShowAppOpen,
	canShowInterstitial,
	createAdSessionState,
	noteMeaningfulAction,
} from '../../src/ads/policy'

const FIVE_MIN = INTERSTITIAL_MIN_INTERVAL_MS

function eligibleBase (now: number) {
	let state = createAdSessionState(now - FIVE_MIN - 1_000)
	for (let i = 0; i < INTERSTITIAL_MIN_MEANINGFUL_ACTIONS; i += 1) {
		state = noteMeaningfulAction(state)
	}
	return state
}

describe('canShowInterstitial', () => {
	it('blocks first session/start window', () => {
		const now = 1_000_000
		let state = createAdSessionState(now)
		for (let i = 0; i < INTERSTITIAL_MIN_MEANINGFUL_ACTIONS; i += 1) {
			state = noteMeaningfulAction(state)
		}
		expect(canShowInterstitial(state, now + 60_000).allowed).toBe(false)
		expect(canShowInterstitial(state, now + 60_000).reason).toBe(
			'first_launch_window',
		)
	})

	it('blocks when under 5 minutes', () => {
		const now = 2_000_000
		const state = {
			...eligibleBase(now),
			lastInterstitialAt: now - 60_000,
			interstitialShownThisSession: false,
		}
		expect(canShowInterstitial(state, now).allowed).toBe(false)
		expect(canShowInterstitial(state, now).reason).toBe('cooldown')
	})

	it('blocks under 5 meaningful actions', () => {
		const now = 3_000_000
		const state = createAdSessionState(now - FIVE_MIN - 1)
		expect(canShowInterstitial(state, now).allowed).toBe(false)
		expect(canShowInterstitial(state, now).reason).toBe('actions')
	})

	it('allows when >=5 min and >=5 actions', () => {
		const now = 4_000_000
		const state = eligibleBase(now)
		expect(canShowInterstitial(state, now).allowed).toBe(true)
	})

	it('blocks second interstitial same session', () => {
		const now = 5_000_000
		const state = {
			...eligibleBase(now),
			interstitialShownThisSession: true,
		}
		expect(canShowInterstitial(state, now).allowed).toBe(false)
		expect(canShowInterstitial(state, now).reason).toBe('session_cap')
	})

	it('blocks during active gameplay', () => {
		const now = 6_000_000
		const state = { ...eligibleBase(now), activeGameplay: true }
		expect(canShowInterstitial(state, now).allowed).toBe(false)
		expect(canShowInterstitial(state, now).reason).toBe('active_gameplay')
	})

	it('blocks immediately after rewarded', () => {
		const now = 7_000_000
		const state = {
			...eligibleBase(now),
			lastRewardedAt: now - 30_000,
		}
		expect(canShowInterstitial(state, now).allowed).toBe(false)
		expect(canShowInterstitial(state, now).reason).toBe('after_rewarded')
	})
})

describe('canShowAppOpen', () => {
	it('blocks during active gameplay', () => {
		const now = 8_000_000
		const state = { ...createAdSessionState(now), activeGameplay: true }
		const decision = canShowAppOpen(state, {
			now,
			isFirstLaunch: false,
			backgroundedAt: now - 60_000,
		})
		expect(decision.allowed).toBe(false)
		expect(
			decision.reason === 'active_gameplay' || decision.reason === 'disabled',
		).toBe(true)
	})

	it('blocks first launch', () => {
		const now = 9_000_000
		const state = createAdSessionState(now)
		const decision = canShowAppOpen(state, {
			now,
			isFirstLaunch: true,
			backgroundedAt: now - 60_000,
		})
		expect(decision.allowed).toBe(false)
	})

	it('documents 1.0 disabled flag', () => {
		expect(APP_OPEN_SHOWS_ENABLED).toBe(false)
	})
})
