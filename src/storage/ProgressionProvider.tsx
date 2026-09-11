/**
 * App-wide campaign progression context.
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
	DEFAULT_PROGRESSION,
	applyLevelCompleted,
	loadProgression,
	resetProgressionForQa,
	saveProgression,
	unlockAllLevelsForQa,
	type ProgressionState,
} from './progression'

interface ProgressionContextValue {
	progression: ProgressionState
	ready: boolean
	markLevelCompleted: (displayNumber: number) => Promise<ProgressionState>
	unlockAllForQa: () => Promise<ProgressionState>
	resetForQa: () => Promise<ProgressionState>
}

const ProgressionContext = createContext<ProgressionContextValue | null>(null)

export function ProgressionProvider ({ children }: { children: ReactNode }) {
	const [progression, setProgression] = useState<ProgressionState>(
		DEFAULT_PROGRESSION,
	)
	const [ready, setReady] = useState(false)
	const progressionRef = useRef(progression)

	useEffect(() => {
		progressionRef.current = progression
	}, [progression])

	useEffect(() => {
		let cancelled = false
		loadProgression().then((loaded) => {
			if (!cancelled) {
				setProgression(loaded)
				setReady(true)
			}
		})
		return () => {
			cancelled = true
		}
	}, [])

	const markLevelCompleted = useCallback(async (displayNumber: number) => {
		const next = applyLevelCompleted(progressionRef.current, displayNumber)
		progressionRef.current = next
		setProgression(next)
		return saveProgression(next)
	}, [])

	const unlockAllForQa = useCallback(async () => {
		if (!__DEV__) {
			return progressionRef.current
		}
		const next = unlockAllLevelsForQa()
		progressionRef.current = next
		setProgression(next)
		return saveProgression(next)
	}, [])

	const resetForQa = useCallback(async () => {
		if (!__DEV__) {
			return progressionRef.current
		}
		const next = resetProgressionForQa()
		progressionRef.current = next
		setProgression(next)
		return saveProgression(next)
	}, [])

	const value = useMemo(
		() => ({
			progression,
			ready,
			markLevelCompleted,
			unlockAllForQa,
			resetForQa,
		}),
		[markLevelCompleted, progression, ready, resetForQa, unlockAllForQa],
	)

	return (
		<ProgressionContext.Provider value={value}>
			{children}
		</ProgressionContext.Provider>
	)
}

export function useProgressionContext (): ProgressionContextValue {
	const value = useContext(ProgressionContext)
	if (!value) {
		throw new Error('useProgressionContext requires ProgressionProvider')
	}
	return value
}
