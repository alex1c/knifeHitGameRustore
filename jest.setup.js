jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

jest.mock('expo-audio', () => ({
	createAudioPlayer: jest.fn(() => ({
		volume: 0,
		seekTo: jest.fn(async () => {}),
		play: jest.fn(),
		pause: jest.fn(),
		remove: jest.fn(),
	})),
	setAudioModeAsync: jest.fn(),
	setIsAudioActiveAsync: jest.fn(),
}))

jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	notificationAsync: jest.fn(),
	selectionAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
	NotificationFeedbackType: { Success: 'Success' },
}))

jest.mock('@appmetrica/react-native-analytics', () => ({
	__esModule: true,
	default: {
		activate: jest.fn(),
		reportEvent: jest.fn(),
		reportError: jest.fn(),
	},
}))

jest.mock('yandex-mobile-ads', () => {
	const BannerView = () => null
	return {
		MobileAds: {
			initialize: jest.fn(async () => {}),
			pluginVersion: 'test',
		},
		BannerAdSize: {
			stickySize: jest.fn(async () => ({
				width: 320,
				height: 50,
				initialWidth: 320,
				initialHeight: 50,
				widthInPixels: 320,
				heightInPixels: 50,
				type: 'sticky',
			})),
			inlineSize: jest.fn(async () => ({
				width: 320,
				height: 50,
				initialWidth: 320,
				initialHeight: 50,
				widthInPixels: 320,
				heightInPixels: 50,
				type: 'inline',
			})),
		},
		BannerView,
		InterstitialAdLoader: {
			create: jest.fn(async () => ({
				loadAd: jest.fn(async () => ({
					show: jest.fn(async () => {}),
					onAdShown: null,
					onAdFailedToShow: null,
					onAdDismissed: null,
					onAdImpression: null,
				})),
			})),
		},
		RewardedAdLoader: {
			create: jest.fn(async () => ({
				loadAd: jest.fn(async () => ({
					show: jest.fn(async () => {}),
					onAdShown: null,
					onAdFailedToShow: null,
					onAdDismissed: null,
					onRewarded: null,
				})),
			})),
		},
		AppOpenAdLoader: {
			create: jest.fn(async () => ({
				loadAd: jest.fn(async () => ({
					show: jest.fn(async () => {}),
					onAdShown: null,
					onAdFailedToShow: null,
					onAdDismissed: null,
				})),
			})),
		},
	}
})
