/**
 * Settings: sound, vibration, appearance, about.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import {
	PROJECTILE_THEMES,
	TARGET_THEMES,
	highestCompletedLevel,
	isProjectileThemeUnlocked,
	isTargetThemeUnlocked,
	type ProjectileThemeId,
	type TargetThemeId,
} from '../appearance/themes'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { playSfx } from '../feel/audio'
import { hapticTap } from '../feel/haptics'
import { trackEvent } from '../analytics/adapter'
import type { RootStackParamList } from '../navigation/types'
import { useProgressionContext } from '../storage/ProgressionProvider'
import { useSettingsContext } from '../storage/SettingsProvider'
import { colors, radii, spacing, touchTarget, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

export function SettingsScreen ({ navigation }: Props) {
	const { settings, setSoundEnabled, setVibrationEnabled, setProjectileThemeId, setTargetThemeId } =
		useSettingsContext()
	const { progression } = useProgressionContext()
	const completed = highestCompletedLevel(progression.completedLevels)

	const toggleSound = async () => {
		const next = !settings.soundEnabled
		await setSoundEnabled(next)
		if (next) {
			void playSfx('tap')
		}
		hapticTap()
	}

	const toggleVibration = async () => {
		const next = !settings.vibrationEnabled
		await setVibrationEnabled(next)
		if (next) {
			hapticTap()
		}
	}

	return (
		<Screen scroll>
			<Text style={styles.title}>Настройки</Text>

			<View style={styles.section}>
				<ToggleRow
					label="Звук"
					value={settings.soundEnabled}
					onPress={() => {
						void toggleSound()
					}}
				/>
				<ToggleRow
					label="Вибрация"
					value={settings.vibrationEnabled}
					onPress={() => {
						void toggleVibration()
					}}
				/>
			</View>

			<Text style={styles.sectionTitle}>Снаряд</Text>
			<View style={styles.section}>
				{PROJECTILE_THEMES.map((theme) => {
					const unlocked = isProjectileThemeUnlocked(theme.id, completed)
					const selected = settings.projectileThemeId === theme.id
					return (
						<ThemeRow
							key={theme.id}
							label={theme.label}
							selected={selected}
							unlocked={unlocked}
							lockHint={
								unlocked
									? undefined
									: `Откроется после уровня ${theme.unlockAfterLevel}`
							}
							swatch={theme.fill}
							onPress={() => {
								if (!unlocked) {
									return
								}
								void setProjectileThemeId(theme.id as ProjectileThemeId)
								trackEvent('theme_selected', {
									theme_id: theme.id,
								})
								hapticTap()
							}}
						/>
					)
				})}
			</View>

			<Text style={styles.sectionTitle}>Мишень</Text>
			<View style={styles.section}>
				{TARGET_THEMES.map((theme) => {
					const unlocked = isTargetThemeUnlocked(theme.id, completed)
					const selected = settings.targetThemeId === theme.id
					return (
						<ThemeRow
							key={theme.id}
							label={theme.label}
							selected={selected}
							unlocked={unlocked}
							lockHint={
								unlocked
									? undefined
									: `Откроется после уровня ${theme.unlockAfterLevel}`
							}
							swatch={theme.ring}
							onPress={() => {
								if (!unlocked) {
									return
								}
								void setTargetThemeId(theme.id as TargetThemeId)
								trackEvent('theme_selected', {
									theme_id: theme.id,
								})
								hapticTap()
							}}
						/>
					)
				})}
			</View>

			<View style={styles.about}>
				<Text style={styles.aboutTitle}>О игре</Text>
				<Text style={styles.aboutBody}>
					Меткий нож — аркада на точность и тайминг для RuStore.
				</Text>
				<Text style={styles.aboutMeta}>ForestMusic · v1.0.0</Text>
				<Text style={styles.aboutMeta}>
					Приложение использует AppMetrica (аналитика) и рекламные
					технологии Яндекса. Полный privacy URL будет в release phase.
				</Text>
			</View>

			<PrimaryButton
				label="Обучение"
				variant="secondary"
				onPress={() => navigation.navigate('Learning')}
			/>
			<View style={styles.spacer} />
			<PrimaryButton
				label="Назад"
				variant="ghost"
				onPress={() => navigation.goBack()}
			/>
		</Screen>
	)
}

interface ToggleRowProps {
	label: string
	value: boolean
	onPress: () => void
}

function ToggleRow ({ label, value, onPress }: ToggleRowProps) {
	return (
		<Pressable
			accessibilityRole="switch"
			accessibilityState={{ checked: value }}
			onPress={onPress}
			style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
		>
			<Text style={styles.rowLabel}>{label}</Text>
			<View style={[styles.switch, value && styles.switchOn]}>
				<Text style={styles.switchText}>{value ? 'Вкл' : 'Выкл'}</Text>
			</View>
		</Pressable>
	)
}

interface ThemeRowProps {
	label: string
	selected: boolean
	unlocked: boolean
	lockHint?: string
	swatch: string
	onPress: () => void
}

function ThemeRow ({
	label,
	selected,
	unlocked,
	lockHint,
	swatch,
	onPress,
}: ThemeRowProps) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected, disabled: !unlocked }}
			disabled={!unlocked}
			onPress={onPress}
			style={({ pressed }) => [
				styles.row,
				selected && styles.rowSelected,
				!unlocked && styles.rowLocked,
				pressed && unlocked && styles.rowPressed,
			]}
		>
			<View style={styles.themeLeft}>
				<View style={[styles.swatch, { backgroundColor: swatch }]} />
				<View>
					<Text style={styles.rowLabel}>{label}</Text>
					{lockHint ? (
						<Text style={styles.lockHint}>{lockHint}</Text>
					) : null}
				</View>
			</View>
			<Text style={styles.selectMark}>
				{selected ? 'Выбрано' : unlocked ? 'Выбрать' : 'Закрыто'}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	title: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '700',
		marginBottom: spacing.lg,
	},
	sectionTitle: {
		color: colors.textMuted,
		fontSize: typography.caption,
		fontWeight: '700',
		marginBottom: spacing.sm,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	section: {
		gap: spacing.sm,
		marginBottom: spacing.xl,
	},
	row: {
		minHeight: touchTarget.minHeight,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderWidth: 1,
		borderColor: colors.border,
		gap: spacing.sm,
	},
	rowSelected: {
		borderColor: colors.accent,
	},
	rowLocked: {
		opacity: 0.55,
	},
	rowPressed: {
		opacity: 0.85,
	},
	rowLabel: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '500',
	},
	themeLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		flex: 1,
	},
	swatch: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: colors.border,
	},
	lockHint: {
		color: colors.textMuted,
		fontSize: 12,
		marginTop: 2,
	},
	selectMark: {
		color: colors.textMuted,
		fontSize: typography.caption,
		fontWeight: '600',
	},
	switch: {
		minWidth: 64,
		minHeight: 36,
		borderRadius: radii.pill,
		backgroundColor: colors.surfaceElevated,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.sm,
	},
	switchOn: {
		backgroundColor: colors.accent,
	},
	switchText: {
		color: colors.background,
		fontWeight: '700',
		fontSize: typography.caption,
	},
	about: {
		gap: spacing.xs,
		marginBottom: spacing.xl,
		padding: spacing.md,
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.border,
	},
	aboutTitle: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '600',
	},
	aboutBody: {
		color: colors.textMuted,
		fontSize: typography.body,
		lineHeight: 22,
	},
	aboutMeta: {
		color: colors.textMuted,
		fontSize: typography.caption,
	},
	spacer: {
		height: spacing.sm,
	},
})
