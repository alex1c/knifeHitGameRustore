/**
 * Home screen — brand + primary navigation CTAs.
 */

import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import type { RootStackParamList } from '../navigation/types'
import { colors, spacing, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export function HomeScreen ({ navigation }: Props) {
	return (
		<Screen style={styles.container}>
			<View style={styles.hero}>
				<Text style={styles.brand}>Точный бросок</Text>
				<Text style={styles.subtitle}>
					Точность и тайминг. Попадите в свободное место мишени.
				</Text>
			</View>

			<View style={styles.actions}>
				<PrimaryButton
					label="Играть"
					onPress={() => navigation.navigate('Game', { levelId: 'level-1' })}
				/>
				<PrimaryButton
					label="Уровни"
					variant="secondary"
					onPress={() => navigation.navigate('Levels')}
				/>
				<PrimaryButton
					label="Обучение"
					variant="secondary"
					onPress={() => navigation.navigate('Learning')}
				/>
				<PrimaryButton
					label="Настройки"
					variant="ghost"
					onPress={() => navigation.navigate('Settings')}
				/>
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	container: {
		justifyContent: 'space-between',
	},
	hero: {
		flex: 1,
		justifyContent: 'center',
		gap: spacing.md,
	},
	brand: {
		color: colors.text,
		fontSize: typography.title,
		fontWeight: '700',
		letterSpacing: 0.3,
	},
	subtitle: {
		color: colors.textMuted,
		fontSize: typography.body,
		lineHeight: 24,
		maxWidth: 320,
	},
	actions: {
		gap: spacing.sm,
		paddingBottom: spacing.sm,
	},
})
