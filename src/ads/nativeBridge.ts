/**
 * Thin Yandex Mobile Ads native accessors — mocked in Jest.
 */

import {
	AppOpenAdLoader,
	BannerAdSize,
	BannerView,
	InterstitialAdLoader,
	MobileAds,
	RewardedAdLoader,
	type AdRequestParams,
} from 'yandex-mobile-ads'

export {
	AppOpenAdLoader,
	BannerAdSize,
	BannerView,
	InterstitialAdLoader,
	MobileAds,
	RewardedAdLoader,
}
export type { AdRequestParams }

export async function initializeYandexAdsNative (): Promise<void> {
	await MobileAds.initialize()
}

export function createAdRequest (adUnitId: string): AdRequestParams {
	return { adUnitId }
}
