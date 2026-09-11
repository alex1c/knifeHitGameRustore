/**
 * Game session controller: semantic React state + shared timing for Skia.
 * Background/inactive AppState freezes authoritative elapsed time so the
 * target does not keep spinning while the app is away.
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

import { getLevelById } from '../game/config/levels'
import {
	FLIGHT_DURATION_MS,
	createInitialGameState,
	resetGameState,
	resolveThrowImpact,
	tryBeginThrow,
} from '../game/engine'
import { freezeElapsed, resumeRoundStart } from '../game/engine/roundClock'
import type { GameState, LevelConfig } from '../game/models'

export interface GameController {
	level: LevelConfig
	state: GameState
	clock: SharedValue<number>
	roundStartClock: SharedValue<number>
	isPaused: SharedValue<number>
	frozenElapsedMs: SharedValue<number>
	flightProgress: SharedValue<number>
	roundId: number
	collisionFlashVisible: boolean
	handleTap: () => void
	handleRetry: () => void
	readElapsedMs: () => number
}

export function useGameController (levelId: string): GameController {
	const level = getLevelById(levelId)
	const clock = useClock()
	const roundStartClock = useSharedValue(0)
	const isPaused = useSharedValue(0)
	const frozenElapsedMs = useSharedValue(0)
	const flightProgress = useSharedValue(0)
	const [state, setState] = useState<GameState>(() =>
		createInitialGameState(level, 'playing'),
	)
	const [roundId, setRoundId] = useState(0)
	const [collisionFlashVisible, setCollisionFlashVisible] = useState(false)

	const stateRef = useRef(state)
	const levelRef = useRef(level)
	const throwGateRef = useRef(false)

	useEffect(() => {
		stateRef.current = state
	}, [state])

	useEffect(() => {
		levelRef.current = level
	}, [level])

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
		const subscription = AppState.addEventListener('change', onChange)
		return () => {
			subscription.remove()
		}
	}, [pauseRound, resumeRound])

	const applyImpact = useCallback((impactElapsedMs: number) => {
		const current = stateRef.current
		if (current.status !== 'projectileFlying') {
			return
		}

		const currentLevel = levelRef.current
		const next = resolveThrowImpact(current, currentLevel, impactElapsedMs)
		stateRef.current = next
		setState(next)
		flightProgress.value = next.status === 'lost' ? 1 : 0

		if (next.status === 'lost') {
			setCollisionFlashVisible(true)
			setTimeout(() => {
				setCollisionFlashVisible(false)
			}, 420)
			return
		}

		if (next.status === 'playing') {
			throwGateRef.current = false
		}
	}, [flightProgress])

	const handleTap = useCallback(() => {
		if (throwGateRef.current) {
			return
		}
		if (stateRef.current.status !== 'playing') {
			return
		}

		const elapsedMs = readElapsedMs()
		const result = tryBeginThrow(stateRef.current, elapsedMs)
		if (!result.accepted) {
			return
		}

		throwGateRef.current = true
		stateRef.current = result.state
		setState(result.state)

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
	}, [applyImpact, flightProgress, readElapsedMs])

	const handleRetry = useCallback(() => {
		throwGateRef.current = false
		flightProgress.value = 0
		isPaused.value = 0
		roundStartClock.value = clock.value
		frozenElapsedMs.value = 0
		setCollisionFlashVisible(false)
		const next = resetGameState(levelRef.current)
		stateRef.current = next
		setState(next)
		setRoundId((id) => id + 1)
	}, [clock, flightProgress, frozenElapsedMs, isPaused, roundStartClock])

	return {
		level,
		state,
		clock,
		roundStartClock,
		isPaused,
		frozenElapsedMs,
		flightProgress,
		roundId,
		collisionFlashVisible,
		handleTap,
		handleRetry,
		readElapsedMs,
	}
}
