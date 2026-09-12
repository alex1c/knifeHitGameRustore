/**
 * Endless mode — wave-based infinite run with deterministic difficulty bands.
 *
 * Wave transition design
 * ----------------------
 * On wave clear we intentionally reset the target:
 * - attachments are cleared;
 * - a new LevelConfig (timeline) is applied;
 * - round elapsed is rebased to 0 by the controller.
 * Total score is preserved. This avoids capacity overflow and keeps runs endless.
 */

import {
	constantSegment,
	pauseSegment,
	rampSegment,
} from '../game/engine/timeline'
import { validateLevelConfig } from '../game/config/validateLevel'
import type {
	BeginThrowResult,
	GameState,
	LevelConfig,
	RotationSegment,
} from '../game/models'
import {
	createInitialGameState,
	resetGameState,
	resolveThrowImpact,
	tryBeginThrow,
} from '../game/engine'

export const ENDLESS_BASE_WAVE_HITS = 8
export const ENDLESS_MAX_WAVE_HITS = 12

export type EndlessDifficultyBand = 0 | 1 | 2 | 3 | 4

export interface EndlessRunState {
	score: number
	wave: number
	/** Hits still needed to clear the current wave. */
	hitsRemainingInWave: number
	waveTarget: number
	status: 'playing' | 'projectileFlying' | 'waveClear' | 'lost'
	level: LevelConfig
	game: GameState
	isNewRecord: boolean
}

export function hitsForWave (wave: number): number {
	const capped = ENDLESS_BASE_WAVE_HITS + Math.max(0, wave - 1)
	return Math.min(ENDLESS_MAX_WAVE_HITS, capped)
}

/**
 * Difficulty band from total score (deterministic, no RNG).
 * 0–9 constant, 10–19 faster, 20–29 ramps, 30–39 pause/reversal, 40+ advanced.
 */
export function difficultyBandForScore (score: number): EndlessDifficultyBand {
	if (score < 10) {
		return 0
	}
	if (score < 20) {
		return 1
	}
	if (score < 30) {
		return 2
	}
	if (score < 40) {
		return 3
	}
	return 4
}

function segmentsForBand (
	band: EndlessDifficultyBand,
	wave: number,
): RotationSegment[] {
	const speedBump = Math.min(18, wave * 2)
	switch (band) {
		case 0:
			return [constantSegment(3600, 34 + speedBump * 0.3)]
		case 1:
			return [constantSegment(3200, -(42 + speedBump * 0.4))]
		case 2:
			return [
				rampSegment(1800, 32 + speedBump * 0.3, 55 + speedBump * 0.4),
				rampSegment(1800, 55 + speedBump * 0.4, 32 + speedBump * 0.3),
			]
		case 3:
			return [
				constantSegment(1600, 46 + speedBump * 0.35),
				pauseSegment(320),
				constantSegment(1600, -(46 + speedBump * 0.35)),
			]
		case 4:
		default:
			return [
				rampSegment(1200, 40 + speedBump * 0.3, 68 + speedBump * 0.35),
				pauseSegment(220),
				constantSegment(1100, -(58 + speedBump * 0.3)),
				pauseSegment(220),
			]
	}
}

function obstaclesForBand (band: EndlessDifficultyBand): number[] {
	switch (band) {
		case 0:
			return []
		case 1:
			return [0]
		case 2:
			return [20, 200]
		case 3:
			return [0, 160]
		case 4:
		default:
			return [30, 150, 270]
	}
}

/** Builds a validated LevelConfig for the current endless wave. */
export function buildEndlessLevel (
	wave: number,
	score: number,
): LevelConfig {
	const band = difficultyBandForScore(score)
	const waveHits = hitsForWave(wave)
	const level: LevelConfig = {
		id: `endless-w${wave}-b${band}`,
		displayNumber: wave,
		requiredThrows: waveHits,
		targetRadius: 100,
		projectileSize: 14,
		initialObstacles: obstaclesForBand(band),
		segments: segmentsForBand(band, wave),
	}
	const validation = validateLevelConfig(level)
	if (!validation.ok) {
		// Deterministic safe fallback — never Math.random.
		return {
			id: `endless-w${wave}-safe`,
			displayNumber: wave,
			requiredThrows: waveHits,
			targetRadius: 100,
			projectileSize: 14,
			initialObstacles: band === 0 ? [] : [0],
			segments: [constantSegment(3500, band % 2 === 0 ? 40 : -40)],
		}
	}
	return level
}

export function createEndlessRun (bestScore = 0): EndlessRunState {
	const wave = 1
	const level = buildEndlessLevel(wave, 0)
	const game = createInitialGameState(level, 'playing')
	return {
		score: 0,
		wave,
		hitsRemainingInWave: level.requiredThrows,
		waveTarget: level.requiredThrows,
		status: 'playing',
		level,
		game,
		isNewRecord: false,
	}
}

export function beginEndlessThrow (
	run: EndlessRunState,
	elapsedMs: number,
): { run: EndlessRunState; begin: BeginThrowResult } {
	if (run.status !== 'playing') {
		return {
			run,
			begin: { accepted: false, reason: 'blocked' },
		}
	}
	const begin = tryBeginThrow(run.game, elapsedMs)
	if (!begin.accepted) {
		return { run, begin }
	}
	return {
		begin,
		run: {
			...run,
			status: 'projectileFlying',
			game: begin.state,
		},
	}
}

export function resolveEndlessImpact (
	run: EndlessRunState,
	impactElapsedMs: number,
	bestScore: number,
): EndlessRunState {
	if (run.status !== 'projectileFlying') {
		return run
	}
	const game = resolveThrowImpact(run.game, run.level, impactElapsedMs)
	if (game.status === 'lost') {
		const score = run.score
		return {
			...run,
			status: 'lost',
			game,
			isNewRecord: score > bestScore,
		}
	}

	const score = run.score + 1
	const hitsRemainingInWave = Math.max(0, run.hitsRemainingInWave - 1)

	if (hitsRemainingInWave <= 0 || game.status === 'won') {
		return {
			...run,
			score,
			hitsRemainingInWave: 0,
			status: 'waveClear',
			game: {
				...game,
				status: 'playing',
				remainingThrows: 0,
			},
			isNewRecord: score > bestScore,
		}
	}

	return {
		...run,
		score,
		hitsRemainingInWave,
		status: 'playing',
		game: {
			...game,
			status: 'playing',
		},
		isNewRecord: score > bestScore,
	}
}

/**
 * Advances to the next wave: new config, cleared attachments, score kept.
 */
export function advanceEndlessWave (run: EndlessRunState): EndlessRunState {
	const nextWave = run.wave + 1
	const level = buildEndlessLevel(nextWave, run.score)
	const game = resetGameState(level)
	return {
		...run,
		wave: nextWave,
		hitsRemainingInWave: level.requiredThrows,
		waveTarget: level.requiredThrows,
		status: 'playing',
		level,
		game,
	}
}

export function retryEndlessRun (bestScore: number): EndlessRunState {
	return createEndlessRun(bestScore)
}

/** DEV helper: start a run already inside a difficulty band (score = band * 10). */
export function createEndlessRunAtBand (
	band: EndlessDifficultyBand,
	bestScore = 0,
): EndlessRunState {
	const score = band * 10
	const wave = Math.max(1, Math.floor(score / ENDLESS_BASE_WAVE_HITS) + 1)
	const level = buildEndlessLevel(wave, score)
	const game = createInitialGameState(level, 'playing')
	return {
		score,
		wave,
		hitsRemainingInWave: level.requiredThrows,
		waveTarget: level.requiredThrows,
		status: 'playing',
		level,
		game,
		isNewRecord: score > bestScore,
	}
}
