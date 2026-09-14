/**
 * Centralized Yandex Mobile Ads production unit IDs.
 */

export const YANDEX_AD_UNITS = {
	native: 'R-M-20046177-7',
	appOpen: 'R-M-20046177-6',
	rewarded: 'R-M-20046177-5',
	interstitial: 'R-M-20046177-4',
	bannerHome: 'R-M-20046177-3',
	bannerLevels: 'R-M-20046177-2',
	bannerSecondary: 'R-M-20046177-1',
} as const

export type YandexBannerPlacement = 'home' | 'levels' | 'secondary'

export function bannerUnitForPlacement (
	placement: YandexBannerPlacement,
): string {
	switch (placement) {
		case 'home':
			return YANDEX_AD_UNITS.bannerHome
		case 'levels':
			return YANDEX_AD_UNITS.bannerLevels
		case 'secondary':
			return YANDEX_AD_UNITS.bannerSecondary
	}
}

/** ForestMusic interstitial gates. */
export const INTERSTITIAL_MIN_INTERVAL_MS = 5 * 60 * 1000
export const INTERSTITIAL_MIN_MEANINGFUL_ACTIONS = 5

/**
 * App Open real shows stay disabled for 1.0 — infrastructure is wired,
 * policy remains conservative.
 */
export const APP_OPEN_SHOWS_ENABLED = false
