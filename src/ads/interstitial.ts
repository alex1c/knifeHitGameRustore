/**
 * Interstitial load/show helpers (policy-gated by AdsProvider).
 */

import { YANDEX_AD_UNITS } from './config'
import {
	InterstitialAdLoader,
	createAdRequest,
} from './nativeBridge'

export type InterstitialShowResult =
	| { shown: true }
	| { shown: false; reason: 'load_failed' | 'show_failed' }

export async function showInterstitialAd (): Promise<InterstitialShowResult> {
	try {
		const loader = await InterstitialAdLoader.create()
		const ad = await loader.loadAd(createAdRequest(YANDEX_AD_UNITS.interstitial))
		await new Promise<void>((resolve, reject) => {
			ad.onAdFailedToShow = () => {
				reject(new Error('interstitial_failed_to_show'))
			}
			ad.onAdDismissed = () => {
				resolve()
			}
			ad.onAdShown = () => {
				// impression tracked via analytics at provider level
			}
			void ad.show().catch(reject)
		})
		return { shown: true }
	} catch {
		return { shown: false, reason: 'load_failed' }
	}
}
