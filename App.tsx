/**
 * App entry — providers + audio/feel bootstrap.
 */

import { useEffect, type ReactNode } from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native'

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

export default function App () {
	return (
		<GestureHandlerRootView style={styles.root}>
			<SafeAreaProvider>
				<SettingsProvider>
					<ProgressionProvider>
						<ModesProvider>
							<FeelBootstrap>
								<StatusBar style="light" />
								<RootNavigator />
							</FeelBootstrap>
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
