/**
 * Settings persistence shape for Phase 1.
 * Values stay in memory for now; AsyncStorage can plug in later without API changes.
 */

export interface AppSettings {
	soundEnabled: boolean
	vibrationEnabled: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
	soundEnabled: true,
	vibrationEnabled: true,
}

let cachedSettings: AppSettings = { ...DEFAULT_SETTINGS }

/** Returns the current settings snapshot. */
export function getSettings (): AppSettings {
	return { ...cachedSettings }
}

/** Merges a partial update into the in-memory settings store. */
export function updateSettings (patch: Partial<AppSettings>): AppSettings {
	cachedSettings = { ...cachedSettings, ...patch }
	return getSettings()
}
