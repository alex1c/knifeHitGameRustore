/**
 * Rewarded ad load/show — reward only on confirmed onRewarded callback.
 */

import { YANDEX_AD_UNITS } from './config'
import { RewardedAdLoader, createAdRequest } from './nativeBridge'

export type RewardedShowResult =
	| { completed: true }
	| { completed: false; reason: 'load_failed' | 'show_failed' | 'no_reward' }

export async function showRewardedAd (): Promise<RewardedShowResult> {
	let rewarded = false
	try {
		const loader = await RewardedAdLoader.create()
		const ad = await loader.loadAd(createAdRequest(YANDEX_AD_UNITS.rewarded))
		await new Promise<void>((resolve, reject) => {
			ad.onRewarded = () => {
				rewarded = true
			}
			ad.onAdFailedToShow = () => {
				reject(new Error('rewarded_failed_to_show'))
			}
			ad.onAdDismissed = () => {
				resolve()
			}
			void ad.show().catch(reject)
		})
		if (!rewarded) {
			return { completed: false, reason: 'no_reward' }
		}
		return { completed: true }
	} catch {
		return { completed: false, reason: 'load_failed' }
	}
}
