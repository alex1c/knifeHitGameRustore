/**
 * Settings sanitize / persistence shape tests.
 */

import {
	DEFAULT_SETTINGS,
	sanitizeSettings,
	updateSettings,
} from '../../src/storage/settings'

describe('sanitizeSettings', () => {
	it('falls back on malformed data', () => {
		expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS)
		expect(sanitizeSettings({ soundEnabled: 'yes' }).soundEnabled).toBe(true)
	})

	it('keeps valid toggles and themes', () => {
		const sanitized = sanitizeSettings({
			soundEnabled: false,
			vibrationEnabled: false,
			projectileThemeId: 'neonPin',
			targetThemeId: 'auroraRing',
		})
		expect(sanitized.soundEnabled).toBe(false)
		expect(sanitized.vibrationEnabled).toBe(false)
		expect(sanitized.projectileThemeId).toBe('neonPin')
		expect(sanitized.targetThemeId).toBe('auroraRing')
	})

	it('rejects unknown theme ids', () => {
		const sanitized = sanitizeSettings({
			projectileThemeId: 'knifeClone',
			targetThemeId: 'woodenLog',
		})
		expect(sanitized.projectileThemeId).toBe('classicSpike')
		expect(sanitized.targetThemeId).toBe('rangeCore')
	})
})

describe('updateSettings cache', () => {
	it('merges patches into the in-memory cache', () => {
		const next = updateSettings({ soundEnabled: false })
		expect(next.soundEnabled).toBe(false)
		updateSettings({ soundEnabled: true })
	})
})
