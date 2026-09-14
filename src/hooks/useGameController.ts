/**
 * Game session controller: semantic React state + shared timing for Skia.
 * Presentation events are emitted after logical decisions — never before.
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
import { emitFeel } from '../feel/events'
import type { GameState, LevelConfig } from '../game/models'
import { resumeAfterSecondChance } from '../ads/secondChance'

export type FxKind = 'none' | 'hit' | 'collision' | 'win'

export interface GameController {
	level: LevelConfig
	state: GameState
	clock: SharedValue<number>
	roundStartClock: SharedValue<number>
	isPaused: SharedValue<number>
	frozenElapsedMs: SharedValue<number>
	flightProgress: SharedValue<number>
	/** 0–1 pulse for target / particle bursts (Skia-driven). */
	fxProgress: SharedValue<number>
	fxKind: FxKind
	fxLocalAngle: number | null
	roundId: number
	collisionFlashVisible: boolean
	/** True after short celebratory delay on win. */
	showWinOverlay: boolean
	secondChanceUsedThisAttempt: boolean
	handleTap: () => void
	handleRetry: () => void
	pauseForAd: () => void
	resumeAfterAd: () => void
	applySecondChanceResume: () => void
	readElapsedMs: () => number
}

export function useGameController (levelId: string): GameController {
	const level = getLevelById(levelId)
	const clock = useClock()
	const roundStartClock = useSharedValue(0)
	const isPaused = useSharedValue(0)
	const frozenElapsedMs = useSharedValue(0)
	const flightProgress = useSharedValue(0)
	const fxProgress = useSharedValue(0)
	const [state, setState] = useState<GameState>(() =>
		createInitialGameState(level, 'playing'),
	)
	const [roundId, setRoundId] = useState(0)
	const [collisionFlashVisible, setCollisionFlashVisible] = useState(false)
	const [fxKind, setFxKind] = useState<FxKind>('none')
	const [fxLocalAngle, setFxLocalAngle] = useState<number | null>(null)
	const [showWinOverlay, setShowWinOverlay] = useState(false)
	const [secondChanceUsedThisAttempt, setSecondChanceUsedThisAttempt] =
		useState(false)

	const stateRef = useRef(state)
	const levelRef = useRef(level)
	const throwGateRef = useRef(false)
	const adFreezeRef = useRef(false)

	useEffect(() => {
		stateRef.current = state
	}, [state])

	useEffect(() => {
		levelRef.current = level
	}, [level])

	useEffect(() => {
		emitFeel({ type: 'levelStarted', displayNumber: level.displayNumber })
	}, [level.displayNumber, levelId])

	const playFx = useCallback((kind: FxKind, angle: number | null) => {
		setFxKind(kind)
		setFxLocalAngle(angle)
		fxProgress.value = 0
		fxProgress.value = withTiming(1, { duration: kind === 'win' ? 420 : 220 })
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
				if (!adFreezeRef.current) {
					resumeRound()
				}
			} else {
				pauseRound()
			}
		}
		const subscription = AppState.addEventListener('change', onChange)
		return () => {
			subscription.remove()
		}
	}, [pauseRound, resumeRound])

	const pauseForAd = useCallback(() => {
		adFreezeRef.current = true
		pauseRound()
	}, [pauseRound])

	const resumeAfterAd = useCallback(() => {
		adFreezeRef.current = false
		resumeRound()
	}, [resumeRound])

	const applySecondChanceResume = useCallback(() => {
		const next = resumeAfterSecondChance(stateRef.current)
		stateRef.current = next
		setState(next)
		setSecondChanceUsedThisAttempt(true)
		throwGateRef.current = false
		flightProgress.value = 0
		setCollisionFlashVisible(false)
		setShowWinOverlay(false)
		setFxKind('none')
		setFxLocalAngle(null)
	}, [flightProgress])
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
			emitFeel({
				type: 'collision',
				localAngle: next.lastImpactLocalAngle,
				displayNumber: currentLevel.displayNumber,
			})
			playFx('collision', next.lastImpactLocalAngle)
			setCollisionFlashVisible(true)
			setTimeout(() => {
				setCollisionFlashVisible(false)
			}, 420)
			return
		}

		if (next.status === 'won') {
			emitFeel({
				type: 'levelWon',
				localAngle: next.lastImpactLocalAngle,
				displayNumber: currentLevel.displayNumber,
			})
			playFx('win', next.lastImpactLocalAngle)
			setTimeout(() => {
				setShowWinOverlay(true)
			}, 350)
			return
		}

		emitFeel({
			type: 'successfulHit',
			localAngle: next.lastImpactLocalAngle,
			displayNumber: currentLevel.displayNumber,
		})
		playFx('hit', next.lastImpactLocalAngle)
		throwGateRef.current = false
	}, [flightProgress, playFx])

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
		emitFeel({ type: 'throwStarted', displayNumber: levelRef.current.displayNumber })

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
		adFreezeRef.current = false
		flightProgress.value = 0
		fxProgress.value = 0
		isPaused.value = 0
		roundStartClock.value = clock.value
		frozenElapsedMs.value = 0
		setCollisionFlashVisible(false)
		setShowWinOverlay(false)
		setSecondChanceUsedThisAttempt(false)
		setFxKind('none')
		setFxLocalAngle(null)
		const next = resetGameState(levelRef.current)
		stateRef.current = next
		setState(next)
		setRoundId((id) => id + 1)
		emitFeel({ type: 'retry', displayNumber: levelRef.current.displayNumber })
	}, [clock, flightProgress, frozenElapsedMs, fxProgress, isPaused, roundStartClock])

	return {
		level,
		state,
		clock,
		roundStartClock,
		isPaused,
		frozenElapsedMs,
		flightProgress,
		fxProgress,
		fxKind,
		fxLocalAngle,
		roundId,
		collisionFlashVisible,
		showWinOverlay,
		secondChanceUsedThisAttempt,
		handleTap,
		handleRetry,
		pauseForAd,
		resumeAfterAd,
		applySecondChanceResume,
		readElapsedMs,
	}
}
