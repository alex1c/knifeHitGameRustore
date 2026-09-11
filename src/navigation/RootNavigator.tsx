/**
 * Root stack navigator for Precision Throw.
 */

import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { GameScreen } from '../screens/GameScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { LearningScreen } from '../screens/LearningScreen'
import { LevelsScreen } from '../screens/LevelsScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { colors } from '../theme'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

const navTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: colors.background,
		card: colors.background,
		text: colors.text,
		border: colors.border,
		primary: colors.primary,
	},
}

export function RootNavigator () {
	return (
		<NavigationContainer theme={navTheme}>
			<Stack.Navigator
				screenOptions={{
					headerShown: false,
					animation: 'fade',
					contentStyle: { backgroundColor: colors.background },
				}}
			>
				<Stack.Screen name="Home" component={HomeScreen} />
				<Stack.Screen name="Game" component={GameScreen} />
				<Stack.Screen name="Levels" component={LevelsScreen} />
				<Stack.Screen name="Learning" component={LearningScreen} />
				<Stack.Screen name="Settings" component={SettingsScreen} />
			</Stack.Navigator>
		</NavigationContainer>
	)
}
