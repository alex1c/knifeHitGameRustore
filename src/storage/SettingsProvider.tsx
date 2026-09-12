/**
 * App-wide settings context with AsyncStorage persistence.
 */

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'

import {
	DEFAULT_SETTINGS,
	loadSettings,
	persistSettingsPatch,
	type AppSettings,
} from './settings'
import type { ProjectileThemeId, TargetThemeId } from '../appearance/themes'

interface SettingsContextValue {
	settings: AppSettings
	ready: boolean
	setSoundEnabled: (value: boolean) => Promise<void>
	setVibrationEnabled: (value: boolean) => Promise<void>
	setProjectileThemeId: (value: ProjectileThemeId) => Promise<void>
	setTargetThemeId: (value: TargetThemeId) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider ({ children }: { children: ReactNode }) {
	const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
	const [ready, setReady] = useState(false)
	const settingsRef = useRef(settings)

	useEffect(() => {
		settingsRef.current = settings
	}, [settings])

	useEffect(() => {
		let cancelled = false
		loadSettings().then((loaded) => {
			if (!cancelled) {
				setSettings(loaded)
				setReady(true)
			}
		})
		return () => {
			cancelled = true
		}
	}, [])

	const patch = useCallback(async (partial: Partial<AppSettings>) => {
		const next = await persistSettingsPatch({
			...settingsRef.current,
			...partial,
		})
		settingsRef.current = next
		setSettings(next)
	}, [])

	const value = useMemo(
		() => ({
			settings,
			ready,
			setSoundEnabled: (value: boolean) => patch({ soundEnabled: value }),
			setVibrationEnabled: (value: boolean) =>
				patch({ vibrationEnabled: value }),
			setProjectileThemeId: (value: ProjectileThemeId) =>
				patch({ projectileThemeId: value }),
			setTargetThemeId: (value: TargetThemeId) =>
				patch({ targetThemeId: value }),
		}),
		[patch, ready, settings],
	)

	return (
		<SettingsContext.Provider value={value}>
			{children}
		</SettingsContext.Provider>
	)
}

export function useSettingsContext (): SettingsContextValue {
	const value = useContext(SettingsContext)
	if (!value) {
		throw new Error('useSettingsContext requires SettingsProvider')
	}
	return value
}
