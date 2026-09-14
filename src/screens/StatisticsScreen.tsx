/**
 * Compact statistics screen for campaign / endless / daily.
 */

import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { BannerAdSlot } from '../ads/BannerAdSlot'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { PRODUCTION_LEVELS } from '../game/config/levels'
import type { RootStackParamList } from '../navigation/types'
import { useModesContext } from '../storage/ModesProvider'
import { useProgressionContext } from '../storage/ProgressionProvider'
import { colors, radii, spacing, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Statistics'>

export function StatisticsScreen ({ navigation }: Props) {
	const { stats, endless, daily } = useModesContext()
	const { progression } = useProgressionContext()

	return (
		<Screen scroll>
			<Text style={styles.title}>Статистика</Text>

			<StatBlock
				title="Кампания"
				lines={[
					`Пройдено уровней: ${progression.completedLevels.length} / ${PRODUCTION_LEVELS.length}`,
					`Открыто до: ${progression.highestUnlockedLevel}`,
				]}
			/>
			<StatBlock
				title="Бесконечный"
				lines={[
					`Рекорд: ${endless.bestScore}`,
					`Забегов: ${endless.runsPlayed}`,
				]}
			/>
			<StatBlock
				title="Испытание дня"
				lines={[
					`Текущая серия: ${daily.currentStreak}`,
					`Лучшая серия: ${daily.bestStreak}`,
					`Дней выполнено: ${daily.completedDailyDates.length}`,
				]}
			/>
			<StatBlock
				title="Общее"
				lines={[
					`Успешных попаданий: ${stats.successfulHits}`,
					`Столкновений: ${stats.collisions}`,
					`Бросков: ${stats.totalThrows}`,
				]}
			/>

			<PrimaryButton
				label="Назад"
				variant="ghost"
				onPress={() => navigation.goBack()}
			/>
			<BannerAdSlot placement="secondary" />
		</Screen>
	)
}

function StatBlock ({
	title,
	lines,
}: {
	title: string
	lines: string[]
}) {
	return (
		<View style={styles.block}>
			<Text style={styles.blockTitle}>{title}</Text>
			{lines.map((line) => (
				<Text key={line} style={styles.line}>
					{line}
				</Text>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	title: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '700',
		marginBottom: spacing.lg,
	},
	block: {
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md,
		marginBottom: spacing.md,
		gap: 4,
	},
	blockTitle: {
		color: colors.accent,
		fontWeight: '700',
		fontSize: typography.body,
		marginBottom: 4,
	},
	line: {
		color: colors.text,
		fontSize: typography.body,
		lineHeight: 22,
	},
})
