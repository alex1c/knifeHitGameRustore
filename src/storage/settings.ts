/**
 * Versioned local app settings (sound, vibration, visual themes).
 * Separate from campaign progression storage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import {
	DEFAULT_PROJECTILE_THEME_ID,
	DEFAULT_TARGET_THEME_ID,
	type ProjectileThemeId,
	type TargetThemeId,
	getProjectileTheme,
	getTargetTheme,
} from '../appearance/themes'

export const SETTINGS_STORAGE_KEY = '@precision_throw/settings/v1'
export const SETTINGS_SCHEMA_VERSION = 1

export interface AppSettings {
	version: number
	soundEnabled: boolean
	vibrationEnabled: boolean
	projectileThemeId: ProjectileThemeId
	targetThemeId: TargetThemeId
}

export const DEFAULT_SETTINGS: AppSettings = {
	version: SETTINGS_SCHEMA_VERSION,
	soundEnabled: true,
	vibrationEnabled: true,
	projectileThemeId: DEFAULT_PROJECTILE_THEME_ID,
	targetThemeId: DEFAULT_TARGET_THEME_ID,
}

let cachedSettings: AppSettings = { ...DEFAULT_SETTINGS }

function isProjectileId (value: unknown): value is ProjectileThemeId {
	return typeof value === 'string' && getProjectileTheme(value).id === value
}

function isTargetId (value: unknown): value is TargetThemeId {
	return typeof value === 'string' && getTargetTheme(value).id === value
}

/** Pure sanitize for loaders and unit tests. */
export function sanitizeSettings (raw: unknown): AppSettings {
	if (!raw || typeof raw !== 'object') {
		return { ...DEFAULT_SETTINGS }
	}
	const record = raw as Record<string, unknown>
	return {
		version: SETTINGS_SCHEMA_VERSION,
		soundEnabled:
			typeof record.soundEnabled === 'boolean'
				? record.soundEnabled
				: DEFAULT_SETTINGS.soundEnabled,
		vibrationEnabled:
			typeof record.vibrationEnabled === 'boolean'
				? record.vibrationEnabled
				: DEFAULT_SETTINGS.vibrationEnabled,
		projectileThemeId: isProjectileId(record.projectileThemeId)
			? record.projectileThemeId
			: DEFAULT_PROJECTILE_THEME_ID,
		targetThemeId: isTargetId(record.targetThemeId)
			? record.targetThemeId
			: DEFAULT_TARGET_THEME_ID,
	}
}

export function getSettings (): AppSettings {
	return { ...cachedSettings }
}

export function updateSettings (patch: Partial<AppSettings>): AppSettings {
	cachedSettings = sanitizeSettings({ ...cachedSettings, ...patch })
	return getSettings()
}

export async function loadSettings (): Promise<AppSettings> {
	try {
		const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
		if (!raw) {
			cachedSettings = { ...DEFAULT_SETTINGS }
			return getSettings()
		}
		cachedSettings = sanitizeSettings(JSON.parse(raw))
		return getSettings()
	} catch {
		cachedSettings = { ...DEFAULT_SETTINGS }
		return getSettings()
	}
}

export async function saveSettings (
	state: AppSettings,
): Promise<AppSettings> {
	const sanitized = sanitizeSettings(state)
	cachedSettings = sanitized
	try {
		await AsyncStorage.setItem(
			SETTINGS_STORAGE_KEY,
			JSON.stringify(sanitized),
		)
	} catch {
		// Persistence failure must not crash gameplay.
	}
	return sanitized
}

export async function persistSettingsPatch (
	patch: Partial<AppSettings>,
): Promise<AppSettings> {
	return saveSettings({ ...cachedSettings, ...patch })
}
