/**
 * Home screen — brand + continue / play CTA.
 */

import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import type { RootStackParamList } from '../navigation/types'
import {
	getContinueLevelId,
} from '../storage/progression'
import { useProgressionContext } from '../storage/ProgressionProvider'
import { colors, spacing, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export function HomeScreen ({ navigation }: Props) {
	const { progression, ready } = useProgressionContext()
	const continueId = getContinueLevelId(progression)
	const hasProgress =
		progression.highestUnlockedLevel > 1 ||
		progression.completedLevels.length > 0

	return (
		<Screen style={styles.container}>
			<View style={styles.hero}>
				<Text style={styles.brand}>Точный бросок</Text>
				<Text style={styles.subtitle}>
					Точность и тайминг. Попадите в свободное место мишени.
				</Text>
				{ready && hasProgress ? (
					<Text style={styles.continueHint}>
						Продолжить: уровень {progression.highestUnlockedLevel}
					</Text>
				) : null}
			</View>

			<View style={styles.actions}>
				<PrimaryButton
					label={hasProgress ? 'Продолжить' : 'Играть'}
					onPress={() =>
						navigation.navigate('Game', { levelId: continueId })
					}
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
	continueHint: {
		color: colors.accent,
		fontSize: typography.body,
		fontWeight: '600',
		marginTop: spacing.xs,
	},
	actions: {
		gap: spacing.sm,
		paddingBottom: spacing.sm,
	},
})
