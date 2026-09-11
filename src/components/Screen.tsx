/**
 * Safe-area aware screen shell used by all routes.
 */

import { type ReactNode } from 'react'
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, spacing } from '../theme'

interface ScreenProps {
	children: ReactNode
	scroll?: boolean
	style?: ViewStyle
	/** Extra bottom padding beyond the device inset (gesture bar cushion). */
	bottomExtra?: number
}

export function Screen ({
	children,
	scroll = false,
	style,
	bottomExtra = spacing.md,
}: ScreenProps) {
	const insets = useSafeAreaInsets()

	const paddingStyle = {
		paddingTop: Math.max(insets.top, spacing.md),
		paddingBottom: Math.max(insets.bottom, spacing.md) + bottomExtra,
		paddingLeft: Math.max(insets.left, spacing.md),
		paddingRight: Math.max(insets.right, spacing.md),
	}

	if (scroll) {
		return (
			<ScrollView
				style={styles.root}
				contentContainerStyle={[styles.scrollContent, paddingStyle, style]}
				keyboardShouldPersistTaps="handled"
			>
				{children}
			</ScrollView>
		)
	}

	return (
		<View style={[styles.root, paddingStyle, style]}>
			{children}
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.background,
	},
	scrollContent: {
		flexGrow: 1,
	},
})
