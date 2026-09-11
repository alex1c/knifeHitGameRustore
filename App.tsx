/**
 * App entry — providers only; screens live under src/.
 */

import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native'

import { RootNavigator } from './src/navigation/RootNavigator'
import { ProgressionProvider } from './src/storage/ProgressionProvider'
import { colors } from './src/theme'

export default function App () {
	return (
		<GestureHandlerRootView style={styles.root}>
			<SafeAreaProvider>
				<ProgressionProvider>
					<StatusBar style="light" />
					<RootNavigator />
				</ProgressionProvider>
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
