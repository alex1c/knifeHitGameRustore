/**
 * Minimal settings foundation: sound, vibration, about.
 */

import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import type { RootStackParamList } from '../navigation/types'
import {
	DEFAULT_SETTINGS,
	getSettings,
	updateSettings,
	type AppSettings,
} from '../storage/settings'
import { colors, radii, spacing, touchTarget, typography } from '../theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

export function SettingsScreen ({ navigation }: Props) {
	const [settings, setSettings] = useState<AppSettings>(() => getSettings())

	const toggle = (key: keyof AppSettings) => {
		const next = updateSettings({ [key]: !settings[key] })
		setSettings(next)
	}

	return (
		<Screen scroll>
			<Text style={styles.title}>Настройки</Text>

			<View style={styles.section}>
				<ToggleRow
					label="Звук"
					value={settings.soundEnabled}
					onPress={() => toggle('soundEnabled')}
				/>
				<ToggleRow
					label="Вибрация"
					value={settings.vibrationEnabled}
					onPress={() => toggle('vibrationEnabled')}
				/>
			</View>

			<View style={styles.about}>
				<Text style={styles.aboutTitle}>О игре</Text>
				<Text style={styles.aboutBody}>
					Точный бросок — аркада на точность и тайминг для RuStore.
				</Text>
				<Text style={styles.aboutMeta}>Precision Throw · v1.0.0</Text>
				<Text style={styles.aboutMeta}>
					Звук: {DEFAULT_SETTINGS.soundEnabled ? 'вкл по умолчанию' : 'выкл'}
				</Text>
			</View>

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

const styles = StyleSheet.create({
	title: {
		color: colors.text,
		fontSize: typography.heading,
		fontWeight: '700',
		marginBottom: spacing.lg,
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
		borderWidth: 1,
		borderColor: colors.border,
	},
	rowPressed: {
		opacity: 0.85,
	},
	rowLabel: {
		color: colors.text,
		fontSize: typography.body,
		fontWeight: '500',
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
})
