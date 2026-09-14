/**
 * App entry — providers + audio/feel + analytics/ads bootstrap.
 */

import { useEffect, type ReactNode } from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native'

import { AdsProvider } from './src/ads/AdsProvider'
import { initAnalytics, trackEvent } from './src/analytics/adapter'
import { bindAudioLifecycle, initAudio } from './src/feel/audio'
import { useFeelFeedback } from './src/feel/useFeelFeedback'
import { useStatsFromFeel } from './src/hooks/useStatsFromFeel'
import { RootNavigator } from './src/navigation/RootNavigator'
import { ModesProvider } from './src/storage/ModesProvider'
import { ProgressionProvider } from './src/storage/ProgressionProvider'
import { SettingsProvider } from './src/storage/SettingsProvider'
import { colors } from './src/theme'

function FeelBootstrap ({ children }: { children: ReactNode }) {
	useFeelFeedback()
	useStatsFromFeel()
	useEffect(() => {
		void initAudio()
		return bindAudioLifecycle()
	}, [])
	return children
}

function MonetizationBootstrap ({ children }: { children: ReactNode }) {
	useEffect(() => {
		// Non-blocking analytics activate + app_open.
		initAnalytics()
		trackEvent('app_open')
	}, [])
	return children
}

export default function App () {
	return (
		<GestureHandlerRootView style={styles.root}>
			<SafeAreaProvider>
				<SettingsProvider>
					<ProgressionProvider>
						<ModesProvider>
							<AdsProvider>
								<FeelBootstrap>
									<MonetizationBootstrap>
										<StatusBar style="light" />
										<RootNavigator />
									</MonetizationBootstrap>
								</FeelBootstrap>
							</AdsProvider>
						</ModesProvider>
					</ProgressionProvider>
				</SettingsProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.background,
	},
})
