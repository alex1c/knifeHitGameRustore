/**
 * Home — campaign continue + endless/daily cards + stats.
 */

import { useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'

import {
	getProjectileTheme,
	resolveProjectileThemeId,
} from '../appearance/themes'
import { BannerAdSlot } from '../ads/BannerAdSlot'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { PRODUCTION_LEVELS } from '../game/config/levels'
import type { RootStackParamList } from '../navigation/types'
import { getContinueLevelId } from '../storage/progression'
import { useModesContext } from '../storage/ModesProvider'
import { useProgressionContext } from '../storage/ProgressionProvider'
import { useSettingsContext } from '../storage/SettingsProvider'
import { colors, radii, spacing, touchTarget, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export function HomeScreen ({ navigation }: Props) {
	const { progression, ready } = useProgressionContext()
	const { settings } = useSettingsContext()
	const {
		endless,
		daily,
		isTodayDailyCompleted,
		ready: modesReady,
		refreshDailyDateKey,
	} = useModesContext()

	useFocusEffect(
		useCallback(() => {
			refreshDailyDateKey()
		}, [refreshDailyDateKey]),
	)

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
		<Screen scroll style={styles.container}>
			<View style={styles.hero}>
				<View style={styles.previewRow}>
					<View
						style={[styles.targetPreview, { borderColor: colors.accent }]}
					>
						<View style={styles.targetCore} />
					</View>
					<View
						style={[
							styles.projectilePreview,
							{ backgroundColor: projectile.fill },
						]}
					/>
				</View>
				<Text style={styles.brand}>Меткий нож</Text>
				<Text style={styles.subtitle}>
					Точность и тайминг. Попадите в свободное место мишени.
				</Text>
			</View>

			<View style={styles.actions}>
				<PrimaryButton
					label={hasProgress ? 'Продолжить кампанию' : 'Играть'}
					onPress={() =>
						navigation.navigate('Game', { levelId: continueId })
					}
				/>

				<ModeCard
					title="Кампания"
					subtitle={
						ready
							? `${completedCount} / ${PRODUCTION_LEVELS.length}`
							: '…'
					}
					onPress={() => navigation.navigate('Levels')}
				/>
				<ModeCard
					title="Бесконечный"
					subtitle={
						modesReady ? `Рекорд: ${endless.bestScore}` : 'Рекорд: …'
					}
					onPress={() => navigation.navigate('Endless')}
				/>
				<ModeCard
					title="Испытание дня"
					subtitle={
						modesReady
							? `${isTodayDailyCompleted ? 'Выполнено' : 'Не выполнено'} · Серия ${daily.currentStreak}`
							: '…'
					}
					accent
					onPress={() => navigation.navigate('Daily')}
				/>

				<PrimaryButton
					label="Статистика"
					variant="secondary"
					onPress={() => navigation.navigate('Statistics')}
				/>
				<PrimaryButton
					label="Обучение"
					variant="ghost"
					onPress={() => navigation.navigate('Learning')}
				/>
				<PrimaryButton
					label="Настройки"
					variant="ghost"
					onPress={() => navigation.navigate('Settings')}
				/>
			</View>

			<View style={styles.bannerPad}>
				<BannerAdSlot placement="home" />
			</View>
		</Screen>
	)
}

function ModeCard ({
	title,
	subtitle,
	onPress,
	accent,
}: {
	title: string
	subtitle: string
	onPress: () => void
	accent?: boolean
}) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [
				styles.card,
				accent && styles.cardAccent,
				pressed && styles.cardPressed,
			]}
		>
			<Text style={styles.cardTitle}>{title}</Text>
			<Text style={styles.cardSubtitle}>{subtitle}</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: {
		justifyContent: 'space-between',
	},
	hero: {
		gap: spacing.md,
		marginBottom: spacing.lg,
		paddingTop: spacing.md,
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
	actions: {
		gap: spacing.sm,
		paddingBottom: spacing.sm,
	},
	bannerPad: {
		marginTop: spacing.md,
	},
	card: {
		minHeight: touchTarget.minHeight,
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		justifyContent: 'center',
	},
	cardAccent: {
		borderColor: colors.primary,
	},
	cardPressed: {
		opacity: 0.85,
	},
	cardTitle: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '700',
	},
	cardSubtitle: {
		color: colors.textMuted,
		fontSize: typography.caption,
		marginTop: 2,
	},
})
