/**
 * Daily challenge session — fixed LevelConfig for the active date key.
 * Remount via DailyScreen `key={dateKey}` when the calendar day changes.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import {
	runOnJS,
	useSharedValue,
	withTiming,
	type SharedValue,
} from 'react-native-reanimated'
import { useClock } from '@shopify/react-native-skia'

import {
	FLIGHT_DURATION_MS,
	createInitialGameState,
	resetGameState,
	resolveThrowImpact,
	tryBeginThrow,
} from '../game/engine'
import { freezeElapsed, resumeRoundStart } from '../game/engine/roundClock'
import { emitFeel } from '../feel/events'
import type { FxKind } from '../hooks/useGameController'
import type { GameState, LevelConfig } from '../game/models'
import { generateDailyChallenge } from '../modes/daily'
import { useModesContext } from '../storage/ModesProvider'

export interface DailyController {
	dateKey: string
	level: LevelConfig
	state: GameState
	alreadyCompleted: boolean
	clock: SharedValue<number>
	roundStartClock: SharedValue<number>
	isPaused: SharedValue<number>
	frozenElapsedMs: SharedValue<number>
	flightProgress: SharedValue<number>
	fxProgress: SharedValue<number>
	fxKind: FxKind
	fxLocalAngle: number | null
	collisionFlashVisible: boolean
	showLossOverlay: boolean
	showWinOverlay: boolean
	handleTap: () => void
	handleRetry: () => void
}

export function useDailyController (dateKey: string): DailyController {
	const {
		isTodayDailyCompleted,
		noteDailyAttempt,
		noteDailyCompleted,
	} = useModesContext()

	const challenge = generateDailyChallenge(dateKey)
	const level = challenge.level

	const clock = useClock()
	const roundStartClock = useSharedValue(0)
	const isPaused = useSharedValue(0)
	const frozenElapsedMs = useSharedValue(0)
	const flightProgress = useSharedValue(0)
	const fxProgress = useSharedValue(0)

	const [state, setState] = useState<GameState>(() =>
		createInitialGameState(level, 'playing'),
	)
	const [fxKind, setFxKind] = useState<FxKind>('none')
	const [fxLocalAngle, setFxLocalAngle] = useState<number | null>(null)
	const [collisionFlashVisible, setCollisionFlashVisible] = useState(false)
	const [showLossOverlay, setShowLossOverlay] = useState(false)
	const [showWinOverlay, setShowWinOverlay] = useState(false)

	const stateRef = useRef(state)
	const levelRef = useRef(level)
	const throwGateRef = useRef(false)
	const attemptRecordedRef = useRef(false)
	const completedRef = useRef(false)

	useEffect(() => {
		stateRef.current = state
	}, [state])

	useEffect(() => {
		levelRef.current = level
	}, [level])

	const playFx = useCallback((kind: FxKind, angle: number | null) => {
		setFxKind(kind)
		setFxLocalAngle(angle)
		fxProgress.value = 0
		fxProgress.value = withTiming(1, { duration: kind === 'win' ? 380 : 200 })
	}, [fxProgress])

	const readElapsedMs = useCallback(() => {
		if (isPaused.value === 1) {
			return frozenElapsedMs.value
		}
		return clock.value - roundStartClock.value
	}, [clock, frozenElapsedMs, isPaused, roundStartClock])

	const pauseRound = useCallback(() => {
		if (isPaused.value === 1) {
			return
		}
		frozenElapsedMs.value = freezeElapsed(clock.value, roundStartClock.value)
		isPaused.value = 1
	}, [clock, frozenElapsedMs, isPaused, roundStartClock])

	const resumeRound = useCallback(() => {
		if (isPaused.value !== 1) {
			return
		}
		roundStartClock.value = resumeRoundStart(
			clock.value,
			frozenElapsedMs.value,
		)
		isPaused.value = 0
	}, [clock, frozenElapsedMs, isPaused, roundStartClock])

	useEffect(() => {
		const onChange = (next: AppStateStatus) => {
			if (next === 'active') {
				resumeRound()
			} else {
				pauseRound()
			}
		}
		const sub = AppState.addEventListener('change', onChange)
		return () => {
			sub.remove()
		}
	}, [pauseRound, resumeRound])

	const applyImpact = useCallback((impactElapsedMs: number) => {
		const current = stateRef.current
		if (current.status !== 'projectileFlying') {
			return
		}
		const next = resolveThrowImpact(
			current,
			levelRef.current,
			impactElapsedMs,
		)
		stateRef.current = next
		setState(next)
		flightProgress.value = next.status === 'lost' ? 1 : 0

		if (next.status === 'lost') {
			emitFeel({
				type: 'collision',
				localAngle: next.lastImpactLocalAngle,
			})
			playFx('collision', next.lastImpactLocalAngle)
			setCollisionFlashVisible(true)
			setTimeout(() => {
				setCollisionFlashVisible(false)
				setShowLossOverlay(true)
			}, 400)
			return
		}

		emitFeel({
			type: 'successfulHit',
			localAngle: next.lastImpactLocalAngle,
		})

		if (next.status === 'won') {
			playFx('win', next.lastImpactLocalAngle)
			emitFeel({ type: 'levelWon', localAngle: next.lastImpactLocalAngle })
			if (!completedRef.current) {
				completedRef.current = true
				void noteDailyCompleted(dateKey)
			}
			setTimeout(() => {
				setShowWinOverlay(true)
			}, 320)
			return
		}

		playFx('hit', next.lastImpactLocalAngle)
		throwGateRef.current = false
	}, [
		dateKey,
		flightProgress,
		noteDailyCompleted,
		playFx,
	])

	const handleTap = useCallback(() => {
		if (throwGateRef.current) {
			return
		}
		if (stateRef.current.status !== 'playing') {
			return
		}
		const result = tryBeginThrow(stateRef.current, readElapsedMs())
		if (!result.accepted) {
			return
		}
		throwGateRef.current = true
		stateRef.current = result.state
		setState(result.state)
		if (!attemptRecordedRef.current) {
			attemptRecordedRef.current = true
			void noteDailyAttempt(dateKey)
		}
		emitFeel({ type: 'throwStarted' })
		flightProgress.value = 0
		flightProgress.value = withTiming(
			1,
			{ duration: FLIGHT_DURATION_MS },
			(finished) => {
				'worklet'
				if (finished) {
					runOnJS(applyImpact)(result.impactElapsedMs)
				}
			},
		)
	}, [
		applyImpact,
		dateKey,
		flightProgress,
		noteDailyAttempt,
		readElapsedMs,
	])

	const handleRetry = useCallback(() => {
		throwGateRef.current = false
		attemptRecordedRef.current = false
		flightProgress.value = 0
		fxProgress.value = 0
		isPaused.value = 0
		roundStartClock.value = clock.value
		frozenElapsedMs.value = 0
		setCollisionFlashVisible(false)
		setShowLossOverlay(false)
		setShowWinOverlay(false)
		setFxKind('none')
		const next = resetGameState(levelRef.current)
		stateRef.current = next
		setState(next)
		emitFeel({ type: 'retry' })
	}, [clock, flightProgress, frozenElapsedMs, fxProgress, isPaused, roundStartClock])

	return {
		dateKey,
		level,
		state,
		alreadyCompleted: isTodayDailyCompleted,
		clock,
		roundStartClock,
		isPaused,
		frozenElapsedMs,
		flightProgress,
		fxProgress,
		fxKind,
		fxLocalAngle,
		collisionFlashVisible,
		showLossOverlay,
		showWinOverlay,
		handleTap,
		handleRetry,
	}
}
