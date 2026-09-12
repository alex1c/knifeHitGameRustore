/**
 * Visual theme unlock / selection resolution tests.
 */

import {
	DEFAULT_PROJECTILE_THEME_ID,
	DEFAULT_TARGET_THEME_ID,
	highestCompletedLevel,
	isMilestoneLevel,
	isProjectileThemeUnlocked,
	resolveProjectileThemeId,
	resolveTargetThemeId,
	themesUnlockedAtLevel,
} from '../../src/appearance/themes'
import {
	DEFAULT_PROGRESSION,
	applyLevelCompleted,
} from '../../src/storage/progression'

describe('theme unlocks', () => {
	it('base themes available from the start', () => {
		expect(isProjectileThemeUnlocked('classicSpike', 0)).toBe(true)
		expect(isProjectileThemeUnlocked('neonPin', 0)).toBe(false)
		expect(isProjectileThemeUnlocked('neonPin', 10)).toBe(true)
		expect(isProjectileThemeUnlocked('steelDart', 20)).toBe(true)
	})

	it('rejects selecting a locked theme', () => {
		expect(resolveProjectileThemeId('neonPin', [])).toBe(
			DEFAULT_PROJECTILE_THEME_ID,
		)
		expect(resolveTargetThemeId('emberDisc', [5])).toBe(
			DEFAULT_TARGET_THEME_ID,
		)
	})

	it('allows unlocked theme selection', () => {
		expect(
			resolveProjectileThemeId('neonPin', [10]),
		).toBe('neonPin')
		expect(
			resolveTargetThemeId('auroraRing', [10, 11]),
		).toBe('auroraRing')
	})

	it('milestone unlock labels appear at 10 and 20', () => {
		expect(themesUnlockedAtLevel(10).length).toBeGreaterThan(0)
		expect(themesUnlockedAtLevel(20).length).toBeGreaterThan(0)
		expect(themesUnlockedAtLevel(5)).toEqual([])
	})

	it('marks 10/20/30 as milestones', () => {
		expect(isMilestoneLevel(10)).toBe(true)
		expect(isMilestoneLevel(20)).toBe(true)
		expect(isMilestoneLevel(30)).toBe(true)
		expect(isMilestoneLevel(11)).toBe(false)
	})
})

describe('cosmetic selection does not alter progression', () => {
	it('theme resolution leaves progression state untouched', () => {
		const before = applyLevelCompleted(DEFAULT_PROGRESSION, 1)
		const unlocked = before.highestUnlockedLevel
		const completed = [...before.completedLevels]
		resolveProjectileThemeId('classicSpike', completed)
		resolveTargetThemeId('rangeCore', completed)
		expect(before.highestUnlockedLevel).toBe(unlocked)
		expect(before.completedLevels).toEqual(completed)
		expect(highestCompletedLevel(completed)).toBe(1)
	})
})
