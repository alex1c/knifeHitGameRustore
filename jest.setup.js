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
