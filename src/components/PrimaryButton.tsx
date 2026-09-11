/**
 * Shared primary button with large touch targets.
 */

import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native'

import { colors, radii, spacing, touchTarget, typography } from '../theme'

interface PrimaryButtonProps extends Omit<PressableProps, 'children'> {
	label: string
	variant?: 'primary' | 'secondary' | 'ghost'
}

export function PrimaryButton ({
	label,
	variant = 'primary',
	disabled,
	...rest
}: PrimaryButtonProps) {
	const backgroundColor =
		variant === 'primary'
			? colors.primary
			: variant === 'secondary'
				? colors.surfaceElevated
				: 'transparent'

	const textColor =
		variant === 'primary' ? colors.background : colors.text

	return (
		<Pressable
			accessibilityRole="button"
			disabled={disabled}
			style={({ pressed }) => [
				styles.base,
				{ backgroundColor },
				variant === 'ghost' && styles.ghost,
				pressed && !disabled && styles.pressed,
				disabled && styles.disabled,
			]}
			{...rest}
		>
			<Text style={[styles.label, { color: textColor }]}>{label}</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	base: {
		minHeight: touchTarget.minHeight,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
		borderRadius: radii.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ghost: {
		borderWidth: 1,
		borderColor: colors.border,
	},
	pressed: {
		opacity: 0.85,
	},
	disabled: {
		opacity: 0.45,
	},
	label: {
		fontSize: typography.button,
		fontWeight: '600',
	},
})
