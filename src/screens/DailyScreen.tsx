/**
 * Daily challenge screen — deterministic challenge for the local date key.
 * No banners during active gameplay.
 */

import { useEffect, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	getProjectileTheme,
	getTargetTheme,
	resolveProjectileThemeId,
	resolveTargetThemeId,
} from '../appearance/themes'
import { useAdsContext } from '../ads/AdsProvider'
import { useGameplayAdGuard } from '../ads/useGameplayAdGuard'
import { trackEvent } from '../analytics/adapter'
import { GameCanvas } from '../components/GameCanvas'
import { PrimaryButton } from '../components/PrimaryButton'
import { useDailyController } from '../hooks/useDailyController'
import type { RootStackParamList } from '../navigation/types'
import { useModesContext } from '../storage/ModesProvider'
import { useProgressionContext } from '../storage/ProgressionProvider'
import { useSettingsContext } from '../storage/SettingsProvider'
import { colors, radii, spacing, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Daily'>

function formatDateLabel (dateKey: string): string {
	const [y, m, d] = dateKey.split('-')
	const months = [
		'января',
		'февраля',
		'марта',
		'апреля',
		'мая',
		'июня',
		'июля',
		'августа',
		'сентября',
		'октября',
		'ноября',
		'декабря',
	]
	const monthIndex = Number(m) - 1
	return `${Number(d)} ${months[monthIndex] ?? m} ${y}`
}

export function DailyScreen ({ navigation }: Props) {
	const {
		activeDailyDateKey,
		daily,
		setDailyDateOverride,
		dailyDateOverride,
		resetDailyForQa,
		setStreakForQa,
	} = useModesContext()

	return (
		<DailySession
			key={activeDailyDateKey}
			dateKey={activeDailyDateKey}
			navigation={navigation}
			daily={daily}
			dailyDateOverride={dailyDateOverride}
			setDailyDateOverride={setDailyDateOverride}
			resetDailyForQa={resetDailyForQa}
			setStreakForQa={setStreakForQa}
		/>
	)
}

interface DailySessionProps {
	dateKey: string
	navigation: Props['navigation']
	daily: ReturnType<typeof useModesContext>['daily']
	dailyDateOverride: string | null
	setDailyDateOverride: (key: string | null) => void
	resetDailyForQa: () => Promise<void>
	setStreakForQa: (current: number, best: number) => Promise<void>
}

function DailySession ({
	dateKey,
	navigation,
	daily,
	dailyDateOverride,
	setDailyDateOverride,
	resetDailyForQa,
	setStreakForQa,
}: DailySessionProps) {
	const insets = useSafeAreaInsets()
	const { progression } = useProgressionContext()
	const { settings } = useSettingsContext()
	const { registerMeaningfulAction, tryShowInterstitial } = useAdsContext()
	useGameplayAdGuard()
	const controller = useDailyController(dateKey)
	const startedRef = useRef(false)
	const resultRef = useRef(false)

	useEffect(() => {
		if (startedRef.current) {
			return
		}
		startedRef.current = true
		trackEvent('daily_start', { mode: 'daily' })
	}, [])

	useEffect(() => {
		if (resultRef.current) {
			return
		}
		if (controller.showWinOverlay) {
			resultRef.current = true
			trackEvent('daily_complete', { mode: 'daily' })
			registerMeaningfulAction()
			void tryShowInterstitial()
			return
		}
		if (controller.showLossOverlay) {
			resultRef.current = true
			trackEvent('daily_fail', { mode: 'daily' })
			registerMeaningfulAction()
		}
	}, [
		controller.showLossOverlay,
		controller.showWinOverlay,
		registerMeaningfulAction,
		tryShowInterstitial,
	])

	const handleRetry = () => {
		resultRef.current = false
		controller.handleRetry()
	}

	const projectileTheme = useMemo(
		() =>
			getProjectileTheme(
				resolveProjectileThemeId(
					settings.projectileThemeId,
					progression.completedLevels,
				),
			),
		[progression.completedLevels, settings.projectileThemeId],
	)
	const targetTheme = useMemo(
		() =>
			getTargetTheme(
				resolveTargetThemeId(
					settings.targetThemeId,
					progression.completedLevels,
				),
			),
		[progression.completedLevels, settings.targetThemeId],
	)

	const canThrow = controller.state.status === 'playing'
	const showReady =
		controller.state.status === 'playing' || controller.state.status === 'ready'
	const showFlying =
		controller.state.status === 'projectileFlying' ||
		(controller.state.status === 'lost' && controller.collisionFlashVisible)

	return (
		<View
			style={[
				styles.root,
				{
					paddingTop: Math.max(insets.top, spacing.sm),
					paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
					paddingHorizontal: spacing.md,
				},
			]}
		>
			<View style={styles.hud}>
				<PrimaryButton
					label="Назад"
					variant="ghost"
					onPress={() => navigation.goBack()}
				/>
				<View style={styles.hudStats}>
					<Text style={styles.hudLabel}>Испытание дня</Text>
					<Text style={styles.hudValue}>
						{formatDateLabel(controller.dateKey)}
					</Text>
					<Text style={styles.hudMuted}>
						Осталось: {controller.state.remainingThrows}
						{controller.alreadyCompleted ? ' · выполнено' : ''}
					</Text>
					<Text style={styles.hudMuted}>
						Серия: {daily.currentStreak}
					</Text>
				</View>
			</View>

			<Pressable
				style={styles.stage}
				disabled={!canThrow}
				onPress={canThrow ? controller.handleTap : undefined}
				accessibilityRole="button"
				accessibilityLabel="Испытание дня. Коснитесь, чтобы бросить"
			>
				<GameCanvas
					level={controller.level}
					attachedProjectiles={controller.state.attachedProjectiles}
					clock={controller.clock}
					roundStartClock={controller.roundStartClock}
					isPaused={controller.isPaused}
					frozenElapsedMs={controller.frozenElapsedMs}
					flightProgress={controller.flightProgress}
					fxProgress={controller.fxProgress}
					fxKind={controller.fxKind}
					fxLocalAngle={controller.fxLocalAngle}
					projectileTheme={projectileTheme}
					targetTheme={targetTheme}
					showReadyProjectile={showReady}
					showFlyingProjectile={showFlying}
					collisionFlashVisible={controller.collisionFlashVisible}
				/>
			</Pressable>

			{__DEV__ ? (
				<View style={styles.devRow}>
					<PrimaryButton
						label="DEV: сброс daily"
						variant="ghost"
						onPress={() => {
							void resetDailyForQa()
						}}
					/>
					<PrimaryButton
						label={
							dailyDateOverride
								? `Override ${dailyDateOverride}`
								: 'DEV: дата +1'
						}
						variant="ghost"
						onPress={() => {
							if (dailyDateOverride) {
								setDailyDateOverride(null)
								return
							}
							const [y, m, d] = dateKey.split('-').map(Number)
							const next = new Date(y!, m! - 1, d! + 1)
							const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
							setDailyDateOverride(key)
						}}
					/>
					<PrimaryButton
						label="DEV: streak 3/5"
						variant="ghost"
						onPress={() => {
							void setStreakForQa(3, 5)
						}}
					/>
				</View>
			) : null}

			{controller.showLossOverlay ? (
				<View style={styles.overlay}>
					<View style={styles.card}>
						<Text style={styles.title}>Столкновение!</Text>
						<Text style={styles.body}>
							Можно пробовать снова — challenge сегодня тот же.
						</Text>
						<PrimaryButton label="Ещё раз" onPress={handleRetry} />
						<View style={styles.spacer} />
						<PrimaryButton
							label="На главную"
							variant="ghost"
							onPress={() => navigation.navigate('Home')}
						/>
					</View>
				</View>
			) : null}

			{controller.showWinOverlay ? (
				<View style={styles.overlay}>
					<View style={styles.card}>
						<Text style={styles.title}>Испытание пройдено</Text>
						<Text style={styles.body}>
							Серия: {daily.currentStreak} · Лучшая: {daily.bestStreak}
						</Text>
						<PrimaryButton
							label="На главную"
							onPress={() => navigation.navigate('Home')}
						/>
						<View style={styles.spacer} />
						<PrimaryButton
							label="Ещё раз"
							variant="ghost"
							onPress={handleRetry}
						/>
					</View>
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: colors.background },
	hud: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: spacing.sm,
		zIndex: 2,
	},
	hudStats: { alignItems: 'flex-end', gap: 2, maxWidth: '70%' },
	hudLabel: {
		color: colors.primary,
		fontSize: typography.body,
		fontWeight: '700',
	},
	hudValue: { color: colors.text, fontSize: typography.caption, fontWeight: '600' },
	hudMuted: { color: colors.textMuted, fontSize: typography.caption },
	stage: { flex: 1, justifyContent: 'center' },
	devRow: { gap: spacing.xs, marginBottom: spacing.sm },
	overlay: {
		position: 'absolute',
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		backgroundColor: 'rgba(8,14,20,0.72)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
		zIndex: 10,
	},
	card: {
		width: '100%',
		maxWidth: 340,
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		padding: spacing.lg,
		borderWidth: 1,
		borderColor: colors.border,
		gap: spacing.sm,
	},
	title: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '700',
		textAlign: 'center',
	},
	body: {
		color: colors.textMuted,
		fontSize: typography.body,
		textAlign: 'center',
		marginBottom: spacing.sm,
	},
	spacer: { height: spacing.xs },
})
