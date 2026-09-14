/**
 * Learning / how-to-play — modes overview for Меткий нож.
 */

import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { trackEvent } from '../analytics/adapter'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import type { RootStackParamList } from '../navigation/types'
import { getContinueLevelId } from '../storage/progression'
import { useProgressionContext } from '../storage/ProgressionProvider'
import { colors, radii, spacing, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Learning'>

const LESSONS = [
	{
		title: 'Бросок',
		body: 'Коснитесь экрана, чтобы выполнить бросок.',
	},
	{
		title: 'Свободное место',
		body: 'Попадайте в свободное место мишени.',
	},
	{
		title: 'Столкновения',
		body: 'Не задевайте уже закреплённые предметы.',
	},
	{
		title: 'Ритм мишени',
		body: 'Цель может менять скорость, останавливаться и менять направление. Используйте паузы и ритм.',
	},
	{
		title: 'Победа',
		body: 'Выполните все броски, чтобы пройти уровень.',
	},
	{
		title: 'Кампания',
		body: '30 уровней с растущей сложностью и открытием стилей.',
	},
	{
		title: 'Бесконечный',
		body: 'Играйте до первой ошибки и улучшайте рекорд.',
	},
	{
		title: 'Испытание дня',
		body: 'Новая deterministic задача каждый день — локально, без сети.',
	},
] as const

export function LearningScreen ({ navigation }: Props) {
	const { progression } = useProgressionContext()
	const continueId = getContinueLevelId(progression)

	useEffect(() => {
		trackEvent('learning_open')
	}, [])

	return (
		<Screen scroll>
			<Text style={styles.title}>Обучение</Text>
			<Text style={styles.subtitle}>
				Короткие правила, чтобы начать играть уверенно.
			</Text>

			<View style={styles.list}>
				{LESSONS.map((lesson, index) => (
					<View key={lesson.title} style={styles.card}>
						<Text style={styles.index}>{index + 1}</Text>
						<View style={styles.cardText}>
							<Text style={styles.cardTitle}>{lesson.title}</Text>
							<Text style={styles.cardBody}>{lesson.body}</Text>
						</View>
					</View>
				))}
			</View>

			<PrimaryButton
				label="К игре"
				onPress={() => navigation.navigate('Game', { levelId: continueId })}
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
	list: {
		gap: spacing.sm,
		marginBottom: spacing.lg,
	},
	card: {
		flexDirection: 'row',
		gap: spacing.md,
		backgroundColor: colors.surface,
		borderRadius: radii.md,
		padding: spacing.md,
		borderWidth: 1,
		borderColor: colors.border,
	},
	index: {
		color: colors.primary,
		fontSize: typography.heading,
		fontWeight: '700',
		width: 28,
	},
	cardText: {
		flex: 1,
		gap: 4,
	},
	cardTitle: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '600',
	},
	cardBody: {
		color: colors.textMuted,
		fontSize: typography.body,
		lineHeight: 22,
	},
	spacer: {
		height: spacing.sm,
	},
})
