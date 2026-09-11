/**
 * Prototype Game screen with Skia canvas.
 * Full throw / collision loop is intentionally deferred to Phase 2.
 */

import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GameCanvas } from '../components/GameCanvas'
import { PrimaryButton } from '../components/PrimaryButton'
import { getLevelById } from '../game/config/levels'
import { createInitialGameState } from '../game/engine'
import type { RootStackParamList } from '../navigation/types'
import { colors, spacing, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>

export function GameScreen ({ navigation, route }: Props) {
	const insets = useSafeAreaInsets()
	const level = getLevelById(route.params.levelId)

	// Domain snapshot for HUD; visual spin lives in Skia/Reanimated.
	const gameState = useMemo(
		() => createInitialGameState(level, 'playing'),
		[level],
	)

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
					<Text style={styles.hudLabel}>
						Уровень {level.displayNumber}
					</Text>
					<Text style={styles.hudValue}>
						Бросков: {gameState.remainingThrows}
					</Text>
				</View>
			</View>

			<View style={styles.stage}>
				<GameCanvas
					level={level}
					attachedProjectiles={gameState.attachedProjectiles}
					visualSpeedDegreesPerSecond={level.initialSpeed}
					direction={level.direction}
				/>
			</View>

			<Text style={styles.hint}>Коснитесь экрана, чтобы бросить</Text>
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
	hint: {
		textAlign: 'center',
		color: colors.textMuted,
		fontSize: typography.caption,
		marginTop: spacing.sm,
	},
})
