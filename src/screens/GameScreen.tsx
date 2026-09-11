/**
 * Playable Game screen — core throw / attach / win / loss loop.
 * Session is keyed by levelId so switching levels remounts a clean round.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GameCanvas } from '../components/GameCanvas'
import { PrimaryButton } from '../components/PrimaryButton'
import { getNextLevelId } from '../game/config/levels'
import { useGameController } from '../hooks/useGameController'
import type { RootStackParamList } from '../navigation/types'
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
	const {
		level,
		state,
		clock,
		roundStartClock,
		flightProgress,
		collisionFlashVisible,
		handleTap,
		handleRetry,
	} = useGameController(levelId)

	const showReadyProjectile =
		state.status === 'playing' || state.status === 'ready'
	const showFlyingProjectile =
		state.status === 'projectileFlying' ||
		(state.status === 'lost' && collisionFlashVisible)
	const canThrow = state.status === 'playing'
	const showLossOverlay = state.status === 'lost' && !collisionFlashVisible
	const showWinOverlay = state.status === 'won'

	const handleNextLevel = () => {
		const nextId = getNextLevelId(level.id)
		if (nextId) {
			navigation.replace('Game', { levelId: nextId })
			return
		}
		navigation.navigate('Levels')
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
				accessibilityLabel="Игровая область. Коснитесь, чтобы бросить"
				disabled={!canThrow}
			>
				<GameCanvas
					level={level}
					attachedProjectiles={state.attachedProjectiles}
					clock={clock}
					roundStartClock={roundStartClock}
					flightProgress={flightProgress}
					showReadyProjectile={showReadyProjectile}
					showFlyingProjectile={showFlyingProjectile}
					collisionLocalAngle={state.lastImpactLocalAngle}
					collisionFlashVisible={collisionFlashVisible}
				/>

				<View style={styles.ammoRow}>
					{Array.from({ length: state.remainingThrows }).map((_, index) => (
						<View key={`ammo-${index}`} style={styles.ammoDot} />
					))}
				</View>
			</Pressable>

			<Text style={styles.hint}>
				{canThrow ? 'Коснитесь экрана, чтобы бросить' : ' '}
			</Text>

			{showLossOverlay ? (
				<View style={styles.overlay} pointerEvents="box-none">
					<View style={styles.overlayCard}>
						<Text style={styles.overlayTitle}>Столкновение!</Text>
						<Text style={styles.overlayBody}>
							Предмет задел уже закреплённый.
						</Text>
						<PrimaryButton label="Ещё раз" onPress={handleRetry} />
					</View>
				</View>
			) : null}

			{showWinOverlay ? (
				<View style={styles.overlay} pointerEvents="box-none">
					<View style={styles.overlayCard}>
						<Text style={styles.overlayTitle}>Уровень пройден</Text>
						<Text style={styles.overlayBody}>
							Все броски закреплены на мишени.
						</Text>
						<PrimaryButton
							label={getNextLevelId(level.id) ? 'Дальше' : 'К уровням'}
							onPress={handleNextLevel}
						/>
						<View style={styles.overlaySpacer} />
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
		backgroundColor: colors.primary,
	},
	hint: {
		textAlign: 'center',
		color: colors.textMuted,
		fontSize: typography.caption,
		marginTop: spacing.sm,
		minHeight: 20,
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
	overlaySpacer: {
		height: spacing.xs,
	},
})
