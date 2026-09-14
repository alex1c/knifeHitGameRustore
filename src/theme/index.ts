/**
 * Visual tokens for Меткий нож — range / target aesthetic.
 * Geometric, high-contrast, no competitor branding.
 */

export const colors = {
	background: '#0F1A24',
	surface: '#1A2A38',
	surfaceElevated: '#243848',
	primary: '#E8A838',
	primaryPressed: '#C98F2A',
	accent: '#3ECFB2',
	targetRing: '#F2F5F8',
	targetCore: '#2A3F52',
	projectile: '#E8A838',
	obstacle: '#7A8FA3',
	text: '#F2F5F8',
	textMuted: '#9AADB8',
	danger: '#E85A4F',
	border: '#334B5E',
} as const

export const spacing = {
	xs: 8,
	sm: 12,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48,
} as const

export const typography = {
	title: 34,
	heading: 24,
	body: 17,
	caption: 14,
	button: 18,
} as const

/** Minimum touch target size for primary controls (Android accessibility). */
export const touchTarget = {
	minHeight: 52,
	minWidth: 52,
} as const

export const radii = {
	sm: 10,
	md: 16,
	lg: 24,
	pill: 999,
} as const
