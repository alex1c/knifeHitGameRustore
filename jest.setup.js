jest.mock('@react-native-async-storage/async-storage', () =>
	require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

jest.mock('expo-av', () => ({
	Audio: {
		Sound: {
			createAsync: jest.fn(async () => ({
				sound: {
					setPositionAsync: jest.fn(),
					playAsync: jest.fn(),
					stopAsync: jest.fn(),
					unloadAsync: jest.fn(),
				},
			})),
		},
		setAudioModeAsync: jest.fn(),
	},
}))

jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	notificationAsync: jest.fn(),
	selectionAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
	NotificationFeedbackType: { Success: 'Success' },
}))
