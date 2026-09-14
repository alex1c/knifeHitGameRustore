/**
 * Campaign Game screen — core loop + feel + optional rewarded second chance.
 * No banners during active gameplay.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	getProjectileTheme,
	getTargetTheme,
	resolveProjectileThemeId,
	resolveTargetThemeId,
	themesUnlockedAtLevel,
} from '../appearance/themes'
import { useAdsContext } from '../ads/AdsProvider'
import { canOfferCampaignSecondChance } from '../ads/secondChance'
import { useGameplayAdGuard } from '../ads/useGameplayAdGuard'
import { trackEvent } from '../analytics/adapter'
import { GameCanvas } from '../components/GameCanvas'
import { PrimaryButton } from '../components/PrimaryButton'
import { getNextLevelId } from '../game/config/levels'
import { useGameController } from '../hooks/useGameController'
import type { RootStackParamList } from '../navigation/types'
import { useModesContext } from '../storage/ModesProvider'
import { useProgressionContext } from '../storage/ProgressionProvider'
import { useSettingsContext } from '../storage/SettingsProvider'
import { colors, radii, spacing, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>

export function GameScreen ({ navigation, route }: Props) {
	return (
		<GameSession
			key={route.params.levelId}
			levelId={route.params.levelId}
			navigation={navigation}
		/>
	)
}

interface GameSessionProps {
	levelId: string
	navigation: Props['navigation']
}

function GameSession ({ levelId, navigation }: GameSessionProps) {
	const insets = useSafeAreaInsets()
	const { markLevelCompleted, progression } = useProgressionContext()
	const { noteCampaignCompletedCount } = useModesContext()
	const { settings } = useSettingsContext()
	const {
		registerMeaningfulAction,
		tryShowInterstitial,
		showCampaignRewarded,
	} = useAdsContext()
	useGameplayAdGuard()

	const recordedWinRef = useRef(false)
	const recordedFailRef = useRef(false)
	const [unlockToast, setUnlockToast] = useState<string | null>(null)
	const [adBusy, setAdBusy] = useState(false)
	const [adUnavailable, setAdUnavailable] = useState(false)
	const {
		level,
		state,
		clock,
		roundStartClock,
		isPaused,
		frozenElapsedMs,
		flightProgress,
		fxProgress,
		fxKind,
		fxLocalAngle,
		collisionFlashVisible,
		showWinOverlay,
		secondChanceUsedThisAttempt,
		handleTap,
		handleRetry,
		pauseForAd,
		resumeAfterAd,
		applySecondChanceResume,
	} = useGameController(levelId)

	const projectileTheme = useMemo(() => {
		const id = resolveProjectileThemeId(
			settings.projectileThemeId,
			progression.completedLevels,
		)
		return getProjectileTheme(id)
	}, [progression.completedLevels, settings.projectileThemeId])

	const targetTheme = useMemo(() => {
		const id = resolveTargetThemeId(
			settings.targetThemeId,
			progression.completedLevels,
		)
		return getTargetTheme(id)
	}, [progression.completedLevels, settings.targetThemeId])

	useEffect(() => {
		trackEvent('campaign_level_start', {
			level: level.displayNumber,
			mode: 'campaign',
		})
	}, [level.displayNumber, levelId])

	useEffect(() => {
		if (state.status !== 'won' || recordedWinRef.current) {
			return
		}
		recordedWinRef.current = true
		trackEvent('campaign_level_complete', {
			level: level.displayNumber,
			mode: 'campaign',
		})
		registerMeaningfulAction()
		void markLevelCompleted(level.displayNumber).then((next) => {
			void noteCampaignCompletedCount(next.completedLevels.length)
			const unlocked = themesUnlockedAtLevel(level.displayNumber)
			if (unlocked.length > 0) {
				setUnlockToast(`Новый стиль открыт: ${unlocked.join(', ')}`)
				setTimeout(() => setUnlockToast(null), 2200)
			}
		})
		void tryShowInterstitial()
	}, [
		level.displayNumber,
		markLevelCompleted,
		noteCampaignCompletedCount,
		registerMeaningfulAction,
		state.status,
		tryShowInterstitial,
	])

	useEffect(() => {
		if (state.status !== 'lost' || recordedFailRef.current) {
			return
		}
		if (collisionFlashVisible) {
			return
		}
		recordedFailRef.current = true
		trackEvent('campaign_level_fail', {
			level: level.displayNumber,
			mode: 'campaign',
		})
	}, [collisionFlashVisible, level.displayNumber, state.status])

	const showReadyProjectile =
		state.status === 'playing' || state.status === 'ready'
	const showFlyingProjectile =
		state.status === 'projectileFlying' ||
		(state.status === 'lost' && collisionFlashVisible)
	const canThrow = state.status === 'playing' && !adBusy
	const showLossOverlay =
		state.status === 'lost' && !collisionFlashVisible && !adBusy
	const nextLevelId = getNextLevelId(level.id)
	const isCampaignComplete = showWinOverlay && nextLevelId === null
	const canSecondChance = canOfferCampaignSecondChance(
		'campaign',
		secondChanceUsedThisAttempt,
	)

	const handleNextLevel = () => {
		if (nextLevelId) {
			navigation.replace('Game', { levelId: nextLevelId })
			return
		}
		navigation.navigate('Levels')
	}

	const handleRetryPress = () => {
		recordedWinRef.current = false
		recordedFailRef.current = false
		setAdUnavailable(false)
		handleRetry()
	}

	const handleSecondChance = async () => {
		if (!canSecondChance || adBusy) {
			return
		}
		setAdUnavailable(false)
		setAdBusy(true)
		pauseForAd()
		const ok = await showCampaignRewarded()
		if (ok) {
			applySecondChanceResume()
			recordedFailRef.current = false
			resumeAfterAd()
			setAdBusy(false)
			return
		}
		resumeAfterAd()
		setAdBusy(false)
		setAdUnavailable(true)
	}

	return (
		<View
			style={[
				styles.root,
				{
					paddingTop: Math.max(insets.top, spacing.sm),
					paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
					paddingLeft: Math.max(insets.left, spacing.md),
					paddingRight: Math.max(insets.right, spacing.md),
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
					<Text style={styles.hudLabel}>Уровень {level.displayNumber}</Text>
					<Text style={styles.hudValue}>
						Осталось: {state.remainingThrows}
					</Text>
				</View>
			</View>

			<Pressable
				style={styles.stage}
				onPress={canThrow ? handleTap : undefined}
				accessibilityRole="button"
				accessibilityLabel="Меткий нож. Коснитесь, чтобы бросить"
				disabled={!canThrow}
			>
				<GameCanvas
					level={level}
					attachedProjectiles={state.attachedProjectiles}
					clock={clock}
					roundStartClock={roundStartClock}
					isPaused={isPaused}
					frozenElapsedMs={frozenElapsedMs}
					flightProgress={flightProgress}
					fxProgress={fxProgress}
					fxKind={fxKind}
					fxLocalAngle={fxLocalAngle}
					projectileTheme={projectileTheme}
					targetTheme={targetTheme}
					showReadyProjectile={showReadyProjectile}
					showFlyingProjectile={showFlyingProjectile}
					collisionFlashVisible={collisionFlashVisible}
				/>

				<View style={styles.ammoRow}>
					{Array.from({ length: state.remainingThrows }).map((_, index) => (
						<View
							key={`ammo-${index}`}
							style={[styles.ammoDot, { backgroundColor: projectileTheme.fill }]}
						/>
					))}
				</View>
			</Pressable>

			<Text style={styles.hint}>
				{canThrow ? 'Коснитесь экрана, чтобы бросить' : ' '}
			</Text>

			{unlockToast ? (
				<View style={styles.toast} accessibilityLiveRegion="polite">
					<Text style={styles.toastText}>{unlockToast}</Text>
				</View>
			) : null}

			{showLossOverlay ? (
				<View style={styles.overlay} pointerEvents="box-none">
					<View style={styles.overlayCard}>
						<Text style={styles.overlayTitle}>Столкновение!</Text>
						<Text style={styles.overlayBody}>
							Предмет задел уже закреплённый.
						</Text>
						{adUnavailable ? (
							<Text style={styles.adError}>Реклама недоступна</Text>
						) : null}
						{canSecondChance ? (
							<>
								<PrimaryButton
									label="Продолжить за рекламу"
									onPress={() => {
										void handleSecondChance()
									}}
								/>
								<View style={styles.overlaySpacer} />
							</>
						) : null}
						<PrimaryButton
							label="Ещё раз"
							variant={canSecondChance ? 'secondary' : undefined}
							onPress={handleRetryPress}
						/>
						<View style={styles.overlaySpacer} />
						<PrimaryButton
							label="Назад"
							variant="ghost"
							onPress={() => navigation.goBack()}
						/>
					</View>
				</View>
			) : null}

			{showWinOverlay ? (
				<View style={styles.overlay} pointerEvents="box-none">
					<View style={styles.overlayCard}>
						<Text style={styles.overlayTitle}>
							{isCampaignComplete
								? 'Все уровни пройдены!'
								: 'Уровень пройден'}
						</Text>
						<Text style={styles.overlayBody}>
							{isCampaignComplete
								? 'Кампания из 30 уровней завершена. Отличная точность.'
								: 'Все броски закреплены на мишени.'}
						</Text>
						<PrimaryButton
							label={nextLevelId ? 'Дальше' : 'К уровням'}
							onPress={handleNextLevel}
						/>
						<View style={styles.overlaySpacer} />
						<PrimaryButton
							label="Ещё раз"
							variant="ghost"
							onPress={handleRetryPress}
						/>
					</View>
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.background,
	},
	hud: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: spacing.sm,
		marginBottom: spacing.sm,
		zIndex: 2,
	},
	hudStats: {
		alignItems: 'flex-end',
		gap: 2,
	},
	hudLabel: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '600',
	},
	hudValue: {
		color: colors.textMuted,
		fontSize: typography.caption,
	},
	stage: {
		flex: 1,
		justifyContent: 'center',
	},
	ammoRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 8,
		marginTop: spacing.sm,
		minHeight: 12,
	},
	ammoDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	hint: {
		textAlign: 'center',
		color: colors.textMuted,
		fontSize: typography.caption,
		marginTop: spacing.sm,
		minHeight: 20,
	},
	toast: {
		position: 'absolute',
		top: 88,
		alignSelf: 'center',
		backgroundColor: colors.surfaceElevated,
		borderColor: colors.accent,
		borderWidth: 1,
		borderRadius: radii.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		zIndex: 20,
		maxWidth: '90%',
	},
	toastText: {
		color: colors.text,
		fontSize: typography.caption,
		fontWeight: '600',
		textAlign: 'center',
	},
	overlay: {
		position: 'absolute',
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		backgroundColor: 'rgba(8, 14, 20, 0.72)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.lg,
		zIndex: 10,
	},
	overlayCard: {
		width: '100%',
		maxWidth: 340,
		backgroundColor: colors.surface,
		borderRadius: radii.lg,
		padding: spacing.lg,
		borderWidth: 1,
		borderColor: colors.border,
		gap: spacing.sm,
	},
	overlayTitle: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '700',
		textAlign: 'center',
	},
	overlayBody: {
		color: colors.textMuted,
		fontSize: typography.body,
		textAlign: 'center',
		marginBottom: spacing.sm,
		lineHeight: 22,
	},
	adError: {
					color: colors.danger,
		textAlign: 'center',
		fontSize: typography.caption,
		marginBottom: spacing.xs,
	},
	overlaySpacer: {
		height: spacing.xs,
	},
})
