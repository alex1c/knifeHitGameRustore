/**
 * Endless mode screen — score / wave HUD + wave-clear banner.
 * No banners during active gameplay.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Pressable,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
	type LayoutChangeEvent,
} from 'react-native'
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
import { useEndlessController } from '../hooks/useEndlessController'
import type { RootStackParamList } from '../navigation/types'
import { useModesContext } from '../storage/ModesProvider'
import { useProgressionContext } from '../storage/ProgressionProvider'
import { useSettingsContext } from '../storage/SettingsProvider'
import { colors, radii, spacing, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Endless'>

export function EndlessScreen ({ navigation }: Props) {
	const insets = useSafeAreaInsets()
	const { width: windowWidth, height: windowHeight } = useWindowDimensions()
	const [stageSize, setStageSize] = useState({
		width: Math.max(1, windowWidth - 32),
		height: Math.max(1, windowHeight * 0.55),
	})
	const handleStageLayout = useCallback((event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout
		if (width <= 0 || height <= 0) {
			return
		}
		setStageSize((prev) =>
			prev.width === width && prev.height === height
				? prev
				: { width, height },
		)
	}, [])
	const { progression } = useProgressionContext()
	const { settings } = useSettingsContext()
	const { resetEndlessBestForQa } = useModesContext()
	const { registerMeaningfulAction, tryShowInterstitial } = useAdsContext()
	useGameplayAdGuard()
	const endedRef = useRef(false)
	const {
		run,
		bestScore,
		clock,
		roundStartClock,
		isPaused,
		frozenElapsedMs,
		flightProgress,
		fxProgress,
		fxKind,
		fxLocalAngle,
		collisionFlashVisible,
		showLossOverlay,
		showWaveBanner,
		handleTap,
		handleRetry,
		jumpToBandForQa,
	} = useEndlessController()

	useEffect(() => {
		trackEvent('endless_start', { mode: 'endless' })
	}, [])

	useEffect(() => {
		if (!showLossOverlay || endedRef.current) {
			return
		}
		endedRef.current = true
		trackEvent('endless_end', {
			mode: 'endless',
			score: run.score,
			wave: run.wave,
			is_new_best: run.isNewRecord,
		})
		if (run.isNewRecord) {
			trackEvent('endless_new_best', {
				mode: 'endless',
				score: run.score,
				is_new_best: true,
			})
		}
		registerMeaningfulAction()
		void tryShowInterstitial()
	}, [
		registerMeaningfulAction,
		run.isNewRecord,
		run.score,
		run.wave,
		showLossOverlay,
		tryShowInterstitial,
	])

	const handleRetryPress = () => {
		endedRef.current = false
		handleRetry()
		trackEvent('endless_start', { mode: 'endless' })
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

	const canThrow = run.status === 'playing'
	const showReady =
		run.status === 'playing' || run.status === 'waveClear'
	const showFlying =
		run.status === 'projectileFlying' ||
		(run.status === 'lost' && collisionFlashVisible)

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
					<Text style={styles.hudLabel}>Бесконечный</Text>
					<Text style={styles.hudValue}>
						Счёт {run.score} · Волна {run.wave}
					</Text>
					<Text style={styles.hudMuted}>Рекорд: {bestScore}</Text>
				</View>
			</View>

			<Pressable
				style={styles.stage}
				disabled={!canThrow}
				onPress={canThrow ? handleTap : undefined}
				onLayout={handleStageLayout}
				accessibilityRole="button"
				accessibilityLabel="Бесконечный режим. Коснитесь, чтобы бросить"
			>
				<GameCanvas
					level={run.level}
					attachedProjectiles={run.game.attachedProjectiles}
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
					showReadyProjectile={showReady}
					showFlyingProjectile={showFlying}
					collisionFlashVisible={collisionFlashVisible}
					availableWidth={stageSize.width}
					availableHeight={stageSize.height}
				/>
			</Pressable>

			{__DEV__ ? (
				<View style={styles.devRow}>
					<PrimaryButton
						label="DEV: band 2"
						variant="ghost"
						onPress={() => jumpToBandForQa(2)}
					/>
					<PrimaryButton
						label="DEV: band 4"
						variant="ghost"
						onPress={() => jumpToBandForQa(4)}
					/>
					<PrimaryButton
						label="DEV: reset best"
						variant="ghost"
						onPress={() => {
							void resetEndlessBestForQa()
						}}
					/>
				</View>
			) : null}

			{showWaveBanner ? (
				<View style={styles.banner} accessibilityLiveRegion="polite">
					<Text style={styles.bannerText}>Волна {run.wave}</Text>
				</View>
			) : null}

			{showLossOverlay ? (
				<View style={styles.overlay}>
					<View style={styles.card}>
						<Text style={styles.title}>Результат: {run.score}</Text>
						<Text style={styles.body}>Рекорд: {bestScore}</Text>
						{run.isNewRecord ? (
							<Text style={styles.record}>Новый рекорд!</Text>
						) : null}
						<PrimaryButton label="Ещё раз" onPress={handleRetryPress} />
						<View style={styles.spacer} />
						<PrimaryButton
							label="На главную"
							variant="ghost"
							onPress={() => navigation.navigate('Home')}
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
	hudStats: { alignItems: 'flex-end', gap: 2 },
	hudLabel: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '700',
	},
	hudValue: { color: colors.accent, fontSize: typography.caption, fontWeight: '600' },
	hudMuted: { color: colors.textMuted, fontSize: typography.caption },
	stage: { flex: 1, justifyContent: 'center', overflow: 'visible' },
	devRow: { gap: spacing.xs, marginBottom: spacing.sm },
	banner: {
		position: 'absolute',
		alignSelf: 'center',
		top: '42%',
		backgroundColor: colors.surfaceElevated,
		borderColor: colors.primary,
		borderWidth: 1,
		borderRadius: radii.md,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
		zIndex: 5,
	},
	bannerText: {
		color: colors.primary,
		fontWeight: '700',
		fontSize: typography.body,
	},
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
	},
	record: {
		color: colors.primary,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: spacing.sm,
	},
	spacer: { height: spacing.xs },
})
