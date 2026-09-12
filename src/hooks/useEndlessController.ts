/**
 * Endless session controller — reuses core engine + wave transitions.
 * Wave clear rebases the round clock (documented target reset).
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

import { FLIGHT_DURATION_MS } from '../game/engine'
import { freezeElapsed, resumeRoundStart } from '../game/engine/roundClock'
import { emitFeel } from '../feel/events'
import type { FxKind } from '../hooks/useGameController'
import {
	advanceEndlessWave,
	beginEndlessThrow,
	createEndlessRun,
	createEndlessRunAtBand,
	resolveEndlessImpact,
	retryEndlessRun,
	type EndlessDifficultyBand,
	type EndlessRunState,
} from '../modes/endless'
import { useModesContext } from '../storage/ModesProvider'

export interface EndlessController {
	run: EndlessRunState
	bestScore: number
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
	showWaveBanner: boolean
	handleTap: () => void
	handleRetry: () => void
	jumpToBandForQa: (band: EndlessDifficultyBand) => void
	readElapsedMs: () => number
}

export function useEndlessController (): EndlessController {
	const {
		endless,
		noteEndlessRunEnd,
	} = useModesContext()

	const clock = useClock()
	const roundStartClock = useSharedValue(0)
	const isPaused = useSharedValue(0)
	const frozenElapsedMs = useSharedValue(0)
	const flightProgress = useSharedValue(0)
	const fxProgress = useSharedValue(0)

	const [run, setRun] = useState<EndlessRunState>(() => createEndlessRun())
	const [fxKind, setFxKind] = useState<FxKind>('none')
	const [fxLocalAngle, setFxLocalAngle] = useState<number | null>(null)
	const [collisionFlashVisible, setCollisionFlashVisible] = useState(false)
	const [showLossOverlay, setShowLossOverlay] = useState(false)
	const [showWaveBanner, setShowWaveBanner] = useState(false)

	const runRef = useRef(run)
	const throwGateRef = useRef(false)
	const runEndedRef = useRef(false)
	const bestRef = useRef(endless.bestScore)

	useEffect(() => {
		runRef.current = run
	}, [run])

	useEffect(() => {
		bestRef.current = endless.bestScore
	}, [endless.bestScore])

	const playFx = useCallback((kind: FxKind, angle: number | null) => {
		setFxKind(kind)
		setFxLocalAngle(angle)
		fxProgress.value = 0
		fxProgress.value = withTiming(1, { duration: kind === 'win' ? 360 : 200 })
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
		roundStartClock.value = resumeRoundStart(clock.value, frozenElapsedMs.value)
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

	const finishWaveClear = useCallback((current: EndlessRunState) => {
		const advanced = advanceEndlessWave(current)
		runRef.current = advanced
		setRun(advanced)
		throwGateRef.current = false
		flightProgress.value = 0
		roundStartClock.value = clock.value
		setShowWaveBanner(true)
		setTimeout(() => {
			setShowWaveBanner(false)
		}, 700)
	}, [clock, flightProgress, roundStartClock])

	const applyImpact = useCallback((impactElapsedMs: number) => {
		const current = runRef.current
		if (current.status !== 'projectileFlying') {
			return
		}
		const next = resolveEndlessImpact(
			current,
			impactElapsedMs,
			bestRef.current,
		)
		runRef.current = next
		setRun(next)
		flightProgress.value = next.status === 'lost' ? 1 : 0

		if (next.status === 'lost') {
			emitFeel({
				type: 'collision',
				localAngle: next.game.lastImpactLocalAngle,
			})
			playFx('collision', next.game.lastImpactLocalAngle)
			setCollisionFlashVisible(true)
			setTimeout(() => {
				setCollisionFlashVisible(false)
				setShowLossOverlay(true)
			}, 400)
			if (!runEndedRef.current) {
				runEndedRef.current = true
				void noteEndlessRunEnd(next.score)
			}
			return
		}

		emitFeel({
			type: 'successfulHit',
			localAngle: next.game.lastImpactLocalAngle,
		})

		if (next.status === 'waveClear') {
			playFx('win', next.game.lastImpactLocalAngle)
			setTimeout(() => {
				finishWaveClear(next)
			}, 280)
			return
		}

		playFx('hit', next.game.lastImpactLocalAngle)
		throwGateRef.current = false
	}, [
		finishWaveClear,
		flightProgress,
		noteEndlessRunEnd,
		playFx,
	])

	const handleTap = useCallback(() => {
		if (throwGateRef.current) {
			return
		}
		if (runRef.current.status !== 'playing') {
			return
		}
		const { run: next, begin } = beginEndlessThrow(
			runRef.current,
			readElapsedMs(),
		)
		if (!begin.accepted) {
			return
		}
		throwGateRef.current = true
		runRef.current = next
		setRun(next)
		emitFeel({ type: 'throwStarted' })
		flightProgress.value = 0
		flightProgress.value = withTiming(
			1,
			{ duration: FLIGHT_DURATION_MS },
			(finished) => {
				'worklet'
				if (finished) {
					runOnJS(applyImpact)(begin.impactElapsedMs)
				}
			},
		)
	}, [applyImpact, flightProgress, readElapsedMs])

	const handleRetry = useCallback(() => {
		throwGateRef.current = false
		runEndedRef.current = false
		flightProgress.value = 0
		fxProgress.value = 0
		isPaused.value = 0
		roundStartClock.value = clock.value
		frozenElapsedMs.value = 0
		setCollisionFlashVisible(false)
		setShowLossOverlay(false)
		setShowWaveBanner(false)
		setFxKind('none')
		setFxLocalAngle(null)
		const next = retryEndlessRun(bestRef.current)
		runRef.current = next
		setRun(next)
		emitFeel({ type: 'retry' })
	}, [clock, flightProgress, frozenElapsedMs, fxProgress, isPaused, roundStartClock])

	const jumpToBandForQa = useCallback((band: EndlessDifficultyBand) => {
		if (!__DEV__) {
			return
		}
		throwGateRef.current = false
		runEndedRef.current = false
		flightProgress.value = 0
		fxProgress.value = 0
		isPaused.value = 0
		roundStartClock.value = clock.value
		frozenElapsedMs.value = 0
		setCollisionFlashVisible(false)
		setShowLossOverlay(false)
		setShowWaveBanner(false)
		setFxKind('none')
		setFxLocalAngle(null)
		const next = createEndlessRunAtBand(band, bestRef.current)
		runRef.current = next
		setRun(next)
	}, [clock, flightProgress, frozenElapsedMs, fxProgress, isPaused, roundStartClock])

	return {
		run,
		bestScore: endless.bestScore,
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
		showWaveBanner,
		handleTap,
		handleRetry,
		jumpToBandForQa,
		readElapsedMs,
	}
}
