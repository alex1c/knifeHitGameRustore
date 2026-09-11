/**
 * Game session controller: semantic React state + shared timing for Skia.
 * React state updates only on throw / impact / win / loss / reset.
 *
 * Mount a fresh instance per level via React `key={levelId}` so round timing
 * resets without a setState-in-effect level switcher.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
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
import type { GameState, LevelConfig } from '../game/models'

export interface GameController {
	level: LevelConfig
	state: GameState
	/** Skia clock (ms since canvas mount). */
	clock: SharedValue<number>
	/** Clock value captured at round start — elapsed = clock - roundStartClock. */
	roundStartClock: SharedValue<number>
	/** 0 = at rest bottom, 1 = at impact. Animated without React frames. */
	flightProgress: SharedValue<number>
	/** Increments on each retry so dependents can observe a new round. */
	roundId: number
	collisionFlashVisible: boolean
	handleTap: () => void
	handleRetry: () => void
	/** Elapsed ms from the authoritative shared clock (JS-thread read). */
	readElapsedMs: () => number
}

export function useGameController (levelId: string): GameController {
	const level = getLevelById(levelId)
	const clock = useClock()
	const roundStartClock = useSharedValue(0)
	const flightProgress = useSharedValue(0)
	const [state, setState] = useState<GameState>(() =>
		createInitialGameState(level, 'playing'),
	)
	const [roundId, setRoundId] = useState(0)
	const [collisionFlashVisible, setCollisionFlashVisible] = useState(false)

	const stateRef = useRef(state)
	const levelRef = useRef(level)
	/** Synchronous gate — protects against rapid taps before React re-renders. */
	const throwGateRef = useRef(false)

	useEffect(() => {
		stateRef.current = state
	}, [state])

	useEffect(() => {
		levelRef.current = level
	}, [level])

	// On mount (including level remount via key), clock and roundStartClock both
	// start at 0 — no post-paint offset. Retry re-bases roundStartClock explicitly.

	const readElapsedMs = useCallback(() => {
		return clock.value - roundStartClock.value
	}, [clock, roundStartClock])

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
		roundStartClock.value = clock.value
		setCollisionFlashVisible(false)
		const next = resetGameState(levelRef.current)
		stateRef.current = next
		setState(next)
		setRoundId((id) => id + 1)
	}, [clock, flightProgress, roundStartClock])

	return {
		level,
		state,
		clock,
		roundStartClock,
		flightProgress,
		roundId,
		collisionFlashVisible,
		handleTap,
		handleRetry,
		readElapsedMs,
	}
}
