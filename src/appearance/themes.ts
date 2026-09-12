/**
 * Visual themes for projectiles and targets.
 * Unlocked by campaign milestones — no economy.
 */

export type ProjectileThemeId = 'classicSpike' | 'neonPin' | 'steelDart'
export type TargetThemeId = 'rangeCore' | 'auroraRing' | 'emberDisc'

export interface ProjectileTheme {
	id: ProjectileThemeId
	label: string
	/** Unlocked after completing this display number (0 = from start). */
	unlockAfterLevel: number
	fill: string
	accent: string
	/** Tip shape hint for Skia drawing. */
	silhouette: 'spike' | 'pin' | 'dart'
}

export interface TargetTheme {
	id: TargetThemeId
	label: string
	unlockAfterLevel: number
	core: string
	ring: string
	accent: string
	mark: string
}

export const PROJECTILE_THEMES: ProjectileTheme[] = [
	{
		id: 'classicSpike',
		label: 'Классический шип',
		unlockAfterLevel: 0,
		fill: '#E8A838',
		accent: '#F5D48A',
		silhouette: 'spike',
	},
	{
		id: 'neonPin',
		label: 'Неоновый штифт',
		unlockAfterLevel: 10,
		fill: '#3ECFB2',
		accent: '#A8FFF0',
		silhouette: 'pin',
	},
	{
		id: 'steelDart',
		label: 'Стальной маркер',
		unlockAfterLevel: 20,
		fill: '#C5D0DC',
		accent: '#7AA0C4',
		silhouette: 'dart',
	},
]

export const TARGET_THEMES: TargetTheme[] = [
	{
		id: 'rangeCore',
		label: 'Тир',
		unlockAfterLevel: 0,
		core: '#2A3F52',
		ring: '#F2F5F8',
		accent: '#3ECFB2',
		mark: '#E8A838',
	},
	{
		id: 'auroraRing',
		label: 'Аврора',
		unlockAfterLevel: 10,
		core: '#1C3550',
		ring: '#7EE0FF',
		accent: '#A78BFA',
		mark: '#5EEAD4',
	},
	{
		id: 'emberDisc',
		label: 'Эмбер',
		unlockAfterLevel: 20,
		core: '#3A2430',
		ring: '#FFB86B',
		accent: '#FF7A59',
		mark: '#FDE68A',
	},
]

export const DEFAULT_PROJECTILE_THEME_ID: ProjectileThemeId = 'classicSpike'
export const DEFAULT_TARGET_THEME_ID: TargetThemeId = 'rangeCore'

export const MILESTONE_LEVELS = [10, 20, 30] as const

export function isMilestoneLevel (displayNumber: number): boolean {
	return (MILESTONE_LEVELS as readonly number[]).includes(displayNumber)
}

export function getProjectileTheme (
	id: string | null | undefined,
): ProjectileTheme {
	return (
		PROJECTILE_THEMES.find((theme) => theme.id === id) ??
		PROJECTILE_THEMES[0]!
	)
}

export function getTargetTheme (id: string | null | undefined): TargetTheme {
	return TARGET_THEMES.find((theme) => theme.id === id) ?? TARGET_THEMES[0]!
}

export function isProjectileThemeUnlocked (
	themeId: ProjectileThemeId,
	highestCompletedLevel: number,
): boolean {
	const theme = getProjectileTheme(themeId)
	return highestCompletedLevel >= theme.unlockAfterLevel
}

export function isTargetThemeUnlocked (
	themeId: TargetThemeId,
	highestCompletedLevel: number,
): boolean {
	const theme = getTargetTheme(themeId)
	return highestCompletedLevel >= theme.unlockAfterLevel
}

/**
 * Highest completed campaign level derived from progression.
 * Completing level N means N is in completedLevels.
 */
export function highestCompletedLevel (
	completedLevels: readonly number[],
): number {
	if (completedLevels.length === 0) {
		return 0
	}
	return Math.max(...completedLevels)
}

/**
 * Resolves a selected theme id, falling back when locked or unknown.
 */
export function resolveProjectileThemeId (
	selected: string | null | undefined,
	completedLevels: readonly number[],
): ProjectileThemeId {
	const completed = highestCompletedLevel(completedLevels)
	const theme = getProjectileTheme(selected)
	if (isProjectileThemeUnlocked(theme.id, completed)) {
		return theme.id
	}
	return DEFAULT_PROJECTILE_THEME_ID
}

export function resolveTargetThemeId (
	selected: string | null | undefined,
	completedLevels: readonly number[],
): TargetThemeId {
	const completed = highestCompletedLevel(completedLevels)
	const theme = getTargetTheme(selected)
	if (isTargetThemeUnlocked(theme.id, completed)) {
		return theme.id
	}
	return DEFAULT_TARGET_THEME_ID
}

/** Themes newly unlocked by completing a specific level (10/20). */
export function themesUnlockedAtLevel (displayNumber: number): string[] {
	const labels: string[] = []
	for (const theme of PROJECTILE_THEMES) {
		if (theme.unlockAfterLevel === displayNumber) {
			labels.push(theme.label)
		}
	}
	for (const theme of TARGET_THEMES) {
		if (theme.unlockAfterLevel === displayNumber) {
			labels.push(theme.label)
		}
	}
	return labels
}
