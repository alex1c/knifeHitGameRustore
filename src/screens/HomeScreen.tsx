/**
 * Home screen — polished arcade start with progress hint.
 */

import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import {
	getProjectileTheme,
	resolveProjectileThemeId,
} from '../appearance/themes'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { PRODUCTION_LEVELS } from '../game/config/levels'
import type { RootStackParamList } from '../navigation/types'
import { getContinueLevelId } from '../storage/progression'
import { useProgressionContext } from '../storage/ProgressionProvider'
import { useSettingsContext } from '../storage/SettingsProvider'
import { colors, radii, spacing, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export function HomeScreen ({ navigation }: Props) {
	const { progression, ready } = useProgressionContext()
	const { settings } = useSettingsContext()
	const continueId = getContinueLevelId(progression)
	const hasProgress =
		progression.highestUnlockedLevel > 1 ||
		progression.completedLevels.length > 0
	const completedCount = progression.completedLevels.length
	const projectile = getProjectileTheme(
		resolveProjectileThemeId(
			settings.projectileThemeId,
			progression.completedLevels,
		),
	)

	return (
		<Screen style={styles.container}>
			<View style={styles.hero}>
				<View style={styles.previewRow}>
					<View
						style={[styles.targetPreview, { borderColor: colors.accent }]}
					>
						<View style={styles.targetCore} />
					</View>
					<View
						style={[styles.projectilePreview, { backgroundColor: projectile.fill }]}
					/>
				</View>
				<Text style={styles.brand}>Точный бросок</Text>
				<Text style={styles.subtitle}>
					Точность и тайминг. Попадите в свободное место мишени.
				</Text>
				{ready ? (
					<Text style={styles.progress}>
						Прогресс: {completedCount} / {PRODUCTION_LEVELS.length}
					</Text>
				) : null}
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
	previewRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.lg,
		marginBottom: spacing.sm,
	},
	targetPreview: {
		width: 72,
		height: 72,
		borderRadius: 36,
		borderWidth: 4,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.surface,
	},
	targetCore: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: colors.primary,
		opacity: 0.85,
	},
	projectilePreview: {
		width: 14,
		height: 46,
		borderRadius: radii.sm,
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
	progress: {
		color: colors.textMuted,
		fontSize: typography.caption,
		fontWeight: '600',
	},
	continueHint: {
		color: colors.accent,
		fontSize: typography.body,
		fontWeight: '600',
	},
	actions: {
		gap: spacing.sm,
		paddingBottom: spacing.sm,
	},
})
