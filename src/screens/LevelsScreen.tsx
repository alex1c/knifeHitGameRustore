/**
 * Level selection stub — a few prototype entries for navigation wiring.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { PROTOTYPE_LEVELS } from '../game/config/levels'
import type { RootStackParamList } from '../navigation/types'
import { colors, radii, spacing, touchTarget, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Levels'>

export function LevelsScreen ({ navigation }: Props) {
	return (
		<Screen scroll>
			<Text style={styles.title}>Уровни</Text>
			<Text style={styles.subtitle}>
				Выберите уровень. Полный набор появится позже.
			</Text>

			<View style={styles.list}>
				{PROTOTYPE_LEVELS.map((level) => (
					<Pressable
						key={level.id}
						accessibilityRole="button"
						style={({ pressed }) => [
							styles.card,
							pressed && styles.cardPressed,
						]}
						onPress={() =>
							navigation.navigate('Game', { levelId: level.id })
						}
					>
						<Text style={styles.cardTitle}>
							Уровень {level.displayNumber}
						</Text>
						<Text style={styles.cardMeta}>
							{level.requiredThrows} бросков · скорость{' '}
							{level.initialSpeed}
						</Text>
					</Pressable>
				))}
			</View>

			<PrimaryButton
				label="Назад"
				variant="ghost"
				onPress={() => navigation.goBack()}
			/>
		</Screen>
	)
}

const styles = StyleSheet.create({
	title: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '700',
		marginBottom: spacing.xs,
	},
	subtitle: {
		color: colors.textMuted,
		fontSize: typography.body,
		marginBottom: spacing.lg,
		lineHeight: 22,
	},
	list: {
		gap: spacing.sm,
		marginBottom: spacing.lg,
	},
	card: {
		minHeight: touchTarget.minHeight,
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		padding: spacing.md,
		borderWidth: 1,
		borderColor: colors.border,
	},
	cardPressed: {
		opacity: 0.85,
	},
	cardTitle: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '600',
	},
	cardMeta: {
		color: colors.textMuted,
		fontSize: typography.caption,
		marginTop: 4,
	},
})
