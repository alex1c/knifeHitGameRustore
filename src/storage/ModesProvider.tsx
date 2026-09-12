/**
 * Aggregates endless / daily / stats persistence for UI.
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
import { AppState, type AppStateStatus } from 'react-native'

import {
	DEFAULT_DAILY,
	isDailyCompletedOn,
	loadDaily,
	recordDailyAttempt,
	recordDailyCompletion,
	resolveActiveDailyDateKey,
	saveDaily,
	type DailyPersisted,
} from './dailyStore'
import {
	DEFAULT_ENDLESS,
	applyEndlessRunEnd,
	loadEndless,
	saveEndless,
	type EndlessPersisted,
} from './endlessStore'
import {
	DEFAULT_STATS,
	loadStats,
	recordCampaignLevelCompleted,
	recordCollision,
	recordDailyCompletedStat,
	recordEndlessRunEnd,
	recordSuccessfulHit,
	recordThrowStarted,
	saveStats,
	type StatsPersisted,
} from './statsStore'

interface ModesContextValue {
	ready: boolean
	endless: EndlessPersisted
	daily: DailyPersisted
	stats: StatsPersisted
	/** DEV-only local date override for daily challenge. */
	dailyDateOverride: string | null
	setDailyDateOverride: (key: string | null) => void
	activeDailyDateKey: string
	isTodayDailyCompleted: boolean
	noteThrowStarted: () => void
	noteSuccessfulHit: () => void
	noteCollision: () => void
	noteEndlessRunEnd: (score: number) => Promise<void>
	noteDailyAttempt: (dateKey: string) => Promise<void>
	noteDailyCompleted: (dateKey: string) => Promise<void>
	noteCampaignCompletedCount: (count: number) => Promise<void>
	resetEndlessBestForQa: () => Promise<void>
	resetDailyForQa: () => Promise<void>
	setStreakForQa: (current: number, best: number) => Promise<void>
	refreshDailyDateKey: () => void
}

const ModesContext = createContext<ModesContextValue | null>(null)

export function ModesProvider ({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(false)
	const [endless, setEndless] = useState<EndlessPersisted>(DEFAULT_ENDLESS)
	const [daily, setDaily] = useState<DailyPersisted>(DEFAULT_DAILY)
	const [stats, setStats] = useState<StatsPersisted>(DEFAULT_STATS)
	const [dailyDateOverride, setDailyDateOverride] = useState<string | null>(
		null,
	)
	const [clockTick, setClockTick] = useState(0)

	const endlessRef = useRef(endless)
	const dailyRef = useRef(daily)
	const statsRef = useRef(stats)

	useEffect(() => {
		endlessRef.current = endless
	}, [endless])
	useEffect(() => {
		dailyRef.current = daily
	}, [daily])
	useEffect(() => {
		statsRef.current = stats
	}, [stats])

	useEffect(() => {
		let cancelled = false
		Promise.all([loadEndless(), loadDaily(), loadStats()]).then(
			([endlessLoaded, dailyLoaded, statsLoaded]) => {
				if (cancelled) {
					return
				}
				setEndless(endlessLoaded)
				setDaily(dailyLoaded)
				setStats(statsLoaded)
				setReady(true)
			},
		)
		return () => {
			cancelled = true
		}
	}, [])

	// Refresh date key on resume / interval so midnight is picked up without a timer to midnight.
	useEffect(() => {
		const bump = () => {
			setClockTick((value) => value + 1)
		}
		const id = setInterval(bump, 60_000)
		const onAppState = (next: AppStateStatus) => {
			if (next === 'active') {
				bump()
			}
		}
		const sub = AppState.addEventListener('change', onAppState)
		return () => {
			clearInterval(id)
			sub.remove()
		}
	}, [])

	const activeDailyDateKey = useMemo(() => {
		void clockTick
		return resolveActiveDailyDateKey(dailyDateOverride)
	}, [clockTick, dailyDateOverride])

	const isTodayDailyCompleted = isDailyCompletedOn(daily, activeDailyDateKey)

	const noteThrowStarted = useCallback(() => {
		const next = recordThrowStarted(statsRef.current)
		statsRef.current = next
		setStats(next)
		void saveStats(next)
	}, [])

	const noteSuccessfulHit = useCallback(() => {
		const next = recordSuccessfulHit(statsRef.current)
		statsRef.current = next
		setStats(next)
		void saveStats(next)
	}, [])

	const noteCollision = useCallback(() => {
		const next = recordCollision(statsRef.current)
		statsRef.current = next
		setStats(next)
		void saveStats(next)
	}, [])

	const noteEndlessRunEnd = useCallback(async (score: number) => {
		const nextEndless = applyEndlessRunEnd(endlessRef.current, score)
		endlessRef.current = nextEndless
		setEndless(nextEndless)
		await saveEndless(nextEndless)

		const nextStats = recordEndlessRunEnd(statsRef.current, score)
		statsRef.current = nextStats
		setStats(nextStats)
		await saveStats(nextStats)
	}, [])

	const noteDailyAttempt = useCallback(async (dateKey: string) => {
		const next = recordDailyAttempt(dailyRef.current, dateKey)
		dailyRef.current = next
		setDaily(next)
		await saveDaily(next)
	}, [])

	const noteDailyCompleted = useCallback(async (dateKey: string) => {
		const already = isDailyCompletedOn(dailyRef.current, dateKey)
		const nextDaily = recordDailyCompletion(dailyRef.current, dateKey)
		dailyRef.current = nextDaily
		setDaily(nextDaily)
		await saveDaily(nextDaily)

		const nextStats = recordDailyCompletedStat(
			statsRef.current,
			dateKey,
			nextDaily.currentStreak,
			nextDaily.bestStreak,
			already,
		)
		statsRef.current = nextStats
		setStats(nextStats)
		await saveStats(nextStats)
	}, [])

	const noteCampaignCompletedCount = useCallback(async (count: number) => {
		const next = recordCampaignLevelCompleted(statsRef.current, count)
		statsRef.current = next
		setStats(next)
		await saveStats(next)
	}, [])

	const resetEndlessBestForQa = useCallback(async () => {
		if (!__DEV__) {
			return
		}
		const next = { ...DEFAULT_ENDLESS }
		endlessRef.current = next
		setEndless(next)
		await saveEndless(next)
	}, [])

	const resetDailyForQa = useCallback(async () => {
		if (!__DEV__) {
			return
		}
		const next = {
			...DEFAULT_DAILY,
			completedDailyDates: [] as string[],
			attemptsByDate: {},
		}
		dailyRef.current = next
		setDaily(next)
		await saveDaily(next)
	}, [])

	const setStreakForQa = useCallback(async (current: number, best: number) => {
		if (!__DEV__) {
			return
		}
		const next = sanitizeMergeDaily(dailyRef.current, current, best)
		dailyRef.current = next
		setDaily(next)
		await saveDaily(next)
	}, [])

	const refreshDailyDateKey = useCallback(() => {
		setClockTick((value) => value + 1)
	}, [])

	const value = useMemo(
		() => ({
			ready,
			endless,
			daily,
			stats,
			dailyDateOverride,
			setDailyDateOverride,
			activeDailyDateKey,
			isTodayDailyCompleted,
			noteThrowStarted,
			noteSuccessfulHit,
			noteCollision,
			noteEndlessRunEnd,
			noteDailyAttempt,
			noteDailyCompleted,
			noteCampaignCompletedCount,
			resetEndlessBestForQa,
			resetDailyForQa,
			setStreakForQa,
			refreshDailyDateKey,
		}),
		[
			activeDailyDateKey,
			daily,
			dailyDateOverride,
			endless,
			isTodayDailyCompleted,
			noteCampaignCompletedCount,
			noteCollision,
			noteDailyAttempt,
			noteDailyCompleted,
			noteEndlessRunEnd,
			noteSuccessfulHit,
			noteThrowStarted,
			ready,
			refreshDailyDateKey,
			resetDailyForQa,
			resetEndlessBestForQa,
			setStreakForQa,
			stats,
		],
	)

	return (
		<ModesContext.Provider value={value}>{children}</ModesContext.Provider>
	)
}

function sanitizeMergeDaily (
	state: DailyPersisted,
	current: number,
	best: number,
): DailyPersisted {
	return {
		...state,
		currentStreak: Math.max(0, Math.floor(current)),
		bestStreak: Math.max(0, Math.floor(best)),
	}
}

export function useModesContext (): ModesContextValue {
	const value = useContext(ModesContext)
	if (!value) {
		throw new Error('useModesContext requires ModesProvider')
	}
	return value
}
