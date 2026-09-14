/**
 * App Open ad infrastructure — real shows gated by policy + feature flag.
 */

import { YANDEX_AD_UNITS } from './config'
import { AppOpenAdLoader, createAdRequest } from './nativeBridge'

export type AppOpenShowResult =
	| { shown: true }
	| { shown: false; reason: string }

export async function showAppOpenAd (): Promise<AppOpenShowResult> {
	try {
		const loader = await AppOpenAdLoader.create()
		const ad = await loader.loadAd(createAdRequest(YANDEX_AD_UNITS.appOpen))
		await new Promise<void>((resolve, reject) => {
			ad.onAdFailedToShow = () => {
				reject(new Error('app_open_failed_to_show'))
			}
			ad.onAdDismissed = () => {
				resolve()
			}
			void ad.show().catch(reject)
		})
		return { shown: true }
	} catch {
		return { shown: false, reason: 'load_failed' }
	}
}
