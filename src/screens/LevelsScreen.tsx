/**
 * Campaign level grid with milestone emphasis and unlock states.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { isMilestoneLevel } from '../appearance/themes'
import { BannerAdSlot } from '../ads/BannerAdSlot'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { PRODUCTION_LEVELS } from '../game/config/levels'
import { compileLevelTimeline } from '../game/engine'
import type { RootStackParamList } from '../navigation/types'
import {
	isLevelCompleted,
	isLevelUnlocked,
} from '../storage/progression'
import { useProgressionContext } from '../storage/ProgressionProvider'
import { colors, radii, spacing, touchTarget, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Levels'>

export function LevelsScreen ({ navigation }: Props) {
	const { progression, unlockAllForQa, resetForQa } = useProgressionContext()

	return (
		<Screen scroll>
			<Text style={styles.title}>Уровни</Text>
			<Text style={styles.subtitle}>
				Открыто до уровня {progression.highestUnlockedLevel} из{' '}
				{PRODUCTION_LEVELS.length}
			</Text>

			<View style={styles.grid}>
				{PRODUCTION_LEVELS.map((level) => {
					const unlocked = isLevelUnlocked(
						progression,
						level.displayNumber,
					)
					const completed = isLevelCompleted(
						progression,
						level.displayNumber,
					)
					const milestone = isMilestoneLevel(level.displayNumber)
					return (
						<Pressable
							key={level.id}
							accessibilityRole="button"
							accessibilityState={{ disabled: !unlocked }}
							accessibilityLabel={`Уровень ${level.displayNumber}${milestone ? ', веха' : ''}${completed ? ', пройден' : ''}${!unlocked ? ', закрыт' : ''}`}
							disabled={!unlocked}
							style={({ pressed }) => [
								styles.cell,
								!unlocked && styles.cellLocked,
								completed && styles.cellCompleted,
								milestone && styles.cellMilestone,
								pressed && unlocked && styles.cellPressed,
							]}
							onPress={() => {
								if (!unlocked) {
									return
								}
								navigation.navigate('Game', { levelId: level.id })
							}}
						>
							<Text
								style={[
									styles.cellNumber,
									!unlocked && styles.cellNumberLocked,
									milestone && styles.cellNumberMilestone,
								]}
							>
								{level.displayNumber}
							</Text>
							<View style={styles.cellBadge}>
								{completed ? (
									<Text style={styles.badgeText}>✓</Text>
								) : null}
								{!unlocked ? (
									<Text style={styles.badgeTextMuted}>•</Text>
								) : null}
							</View>
							{milestone ? (
								<View style={styles.milestoneBar} />
							) : null}
							{__DEV__ ? (
								<Text style={styles.devMeta}>
									{compileLevelTimeline(level).segmentCount}s
								</Text>
							) : null}
						</Pressable>
					)
				})}
			</View>

			{__DEV__ ? (
				<View style={styles.devPanel}>
					<Text style={styles.devTitle}>DEV QA</Text>
					<PrimaryButton
						label="Открыть все уровни для QA"
						variant="secondary"
						onPress={() => {
							void unlockAllForQa()
						}}
					/>
					<View style={styles.devSpacer} />
					<PrimaryButton
						label="Сбросить прогресс"
						variant="ghost"
						onPress={() => {
							void resetForQa()
						}}
					/>
				</View>
			) : null}

			<PrimaryButton
				label="Назад"
				variant="ghost"
				onPress={() => navigation.goBack()}
			/>
			<BannerAdSlot placement="levels" />
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
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		rowGap: spacing.sm,
		marginBottom: spacing.lg,
	},
	cell: {
		width: '18%',
		minHeight: touchTarget.minHeight,
		aspectRatio: 1,
		borderRadius: radii.md,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.xs,
		marginBottom: 2,
	},
	cellLocked: {
		opacity: 0.45,
	},
	cellCompleted: {
		borderColor: colors.accent,
		backgroundColor: colors.surfaceElevated,
	},
	cellMilestone: {
		borderWidth: 2,
		borderColor: colors.primary,
	},
	cellPressed: {
		opacity: 0.85,
	},
	cellNumber: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '700',
	},
	cellNumberLocked: {
		color: colors.textMuted,
	},
	cellNumberMilestone: {
		color: colors.primary,
	},
	cellBadge: {
		position: 'absolute',
		top: 4,
		right: 6,
	},
	badgeText: {
		color: colors.accent,
		fontSize: 12,
		fontWeight: '700',
	},
	badgeTextMuted: {
		color: colors.textMuted,
		fontSize: 14,
		fontWeight: '700',
	},
	milestoneBar: {
		position: 'absolute',
		bottom: 5,
		width: '55%',
		height: 3,
		borderRadius: 2,
		backgroundColor: colors.primary,
	},
	devMeta: {
		position: 'absolute',
		bottom: 4,
		color: colors.textMuted,
		fontSize: 10,
	},
	devPanel: {
		gap: spacing.xs,
		marginBottom: spacing.lg,
		padding: spacing.md,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surfaceElevated,
	},
	devTitle: {
		color: colors.primary,
		fontWeight: '700',
		marginBottom: spacing.xs,
	},
	devSpacer: {
		height: spacing.xs,
	},
})
