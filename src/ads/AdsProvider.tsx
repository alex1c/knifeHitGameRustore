/**
 * Session-scoped ads orchestration: gameplay guards, interstitial, rewarded.
 */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { trackEvent } from '../analytics/adapter'
import { showAppOpenAd } from './appOpen'
import { initializeYandexAdsNative } from './nativeBridge'
import { showInterstitialAd } from './interstitial'
import {
	canShowAppOpen,
	canShowInterstitial,
	createAdSessionState,
	noteMeaningfulAction,
	type AdSessionState,
} from './policy'
import { showRewardedAd } from './rewarded'

interface AdsContextValue {
	ready: boolean
	session: AdSessionState
	setActiveGameplay: (active: boolean) => void
	registerMeaningfulAction: () => void
	tryShowInterstitial: () => Promise<boolean>
	showCampaignRewarded: () => Promise<boolean>
}

const AdsContext = createContext<AdsContextValue | null>(null)

export function AdsProvider ({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(false)
	const [session, setSession] = useState<AdSessionState>(() =>
		createAdSessionState(),
	)
	const sessionRef = useRef(session)
	const backgroundedAtRef = useRef<number | null>(null)
	const firstLaunchRef = useRef(true)

	useEffect(() => {
		sessionRef.current = session
	}, [session])

	useEffect(() => {
		let cancelled = false
		void (async () => {
			try {
				await initializeYandexAdsNative()
			} catch {
				// Offline / native failure — UI continues without ads.
			} finally {
				if (!cancelled) {
					setReady(true)
				}
			}
		})()
		return () => {
			cancelled = true
		}
	}, [])

	useEffect(() => {
		const onChange = (next: AppStateStatus) => {
			if (next !== 'active') {
				backgroundedAtRef.current = Date.now()
				return
			}
			const decision = canShowAppOpen(sessionRef.current, {
				now: Date.now(),
				backgroundedAt: backgroundedAtRef.current,
				isFirstLaunch: firstLaunchRef.current,
			})
			firstLaunchRef.current = false
			backgroundedAtRef.current = null
			if (!decision.allowed) {
				return
			}
			void showAppOpenAd()
		}
		const sub = AppState.addEventListener('change', onChange)
		return () => {
			sub.remove()
		}
	}, [])

	const setActiveGameplay = useCallback((active: boolean) => {
		setSession((prev) => ({ ...prev, activeGameplay: active }))
	}, [])

	const registerMeaningfulAction = useCallback(() => {
		setSession((prev) => noteMeaningfulAction(prev))
	}, [])

	const tryShowInterstitial = useCallback(async () => {
		const decision = canShowInterstitial(sessionRef.current, Date.now())
		if (!decision.allowed) {
			return false
		}
		const result = await showInterstitialAd()
		if (!result.shown) {
			return false
		}
		const now = Date.now()
		setSession((prev) => ({
			...prev,
			lastInterstitialAt: now,
			interstitialShownThisSession: true,
		}))
		trackEvent('ad_interstitial_impression', undefined, { dedupe: false })
		return true
	}, [])

	const showCampaignRewarded = useCallback(async () => {
		trackEvent('ad_rewarded_offer', { mode: 'campaign' }, { dedupe: false })
		const result = await showRewardedAd()
		if (!result.completed) {
			trackEvent(
				'ad_rewarded_failed',
				{ mode: 'campaign' },
				{ dedupe: false },
			)
			return false
		}
		const now = Date.now()
		setSession((prev) => ({
			...prev,
			lastRewardedAt: now,
		}))
		trackEvent(
			'ad_rewarded_complete',
			{ mode: 'campaign' },
			{ dedupe: false },
		)
		return true
	}, [])

	const value = useMemo(
		() => ({
			ready,
			session,
			setActiveGameplay,
			registerMeaningfulAction,
			tryShowInterstitial,
			showCampaignRewarded,
		}),
		[
			ready,
			registerMeaningfulAction,
			session,
			setActiveGameplay,
			showCampaignRewarded,
			tryShowInterstitial,
		],
	)

	return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>
}

export function useAdsContext (): AdsContextValue {
	const value = useContext(AdsContext)
	if (!value) {
		throw new Error('useAdsContext requires AdsProvider')
	}
	return value
}

/** Optional hook for screens that may render outside provider in tests. */
export function useAdsContextOptional (): AdsContextValue | null {
	return useContext(AdsContext)
}
