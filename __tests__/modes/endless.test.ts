/**
 * Endless mode scoring, waves, and difficulty bands.
 */

import { validateLevelConfig } from '../../src/game/config/validateLevel'
import {
	FLIGHT_DURATION_MS,
	constantSegment,
	localImpactAngleAtElapsed,
} from '../../src/game/engine'
import {
	advanceEndlessWave,
	beginEndlessThrow,
	buildEndlessLevel,
	createEndlessRun,
	createEndlessRunAtBand,
	difficultyBandForScore,
	hitsForWave,
	resolveEndlessImpact,
	retryEndlessRun,
} from '../../src/modes/endless'

describe('endless difficulty', () => {
	it('maps score bands deterministically', () => {
		expect(difficultyBandForScore(0)).toBe(0)
		expect(difficultyBandForScore(9)).toBe(0)
		expect(difficultyBandForScore(10)).toBe(1)
		expect(difficultyBandForScore(29)).toBe(2)
		expect(difficultyBandForScore(30)).toBe(3)
		expect(difficultyBandForScore(40)).toBe(4)
	})

	it('builds valid configs for high bands', () => {
		for (const score of [0, 10, 20, 30, 40, 80]) {
			const level = buildEndlessLevel(5, score)
			expect(validateLevelConfig(level).ok).toBe(true)
		}
	})

	it('wave hit targets grow then cap', () => {
		expect(hitsForWave(1)).toBe(8)
		expect(hitsForWave(2)).toBe(9)
		expect(hitsForWave(5)).toBe(12)
		expect(hitsForWave(20)).toBe(12)
	})
})

describe('endless scoring and waves', () => {
	it('increments score on successful hit', () => {
		let run = createEndlessRun(0)
		const begun = beginEndlessThrow(run, 0)
		expect(begun.begin.accepted).toBe(true)
		if (!begun.begin.accepted) {
			return
		}
		run = begun.run
		run = resolveEndlessImpact(run, begun.begin.impactElapsedMs, 0)
		expect(run.score).toBe(1)
		expect(run.status).not.toBe('lost')
	})

	it('collision ends the run', () => {
		let run = createEndlessRun(0)
		run = {
			...run,
			level: {
				...run.level,
				segments: [constantSegment(4000, 0)],
				initialObstacles: [],
			},
			game: {
				...run.game,
				attachedProjectiles: [],
			},
		}
		const blockAngle = localImpactAngleAtElapsed(
			run.level,
			FLIGHT_DURATION_MS,
		)
		run = {
			...run,
			game: {
				...run.game,
				attachedProjectiles: [{ id: 'block', angle: blockAngle }],
			},
		}
		const begun = beginEndlessThrow(run, 0)
		expect(begun.begin.accepted).toBe(true)
		if (!begun.begin.accepted) {
			return
		}
		run = begun.run
		run = resolveEndlessImpact(run, begun.begin.impactElapsedMs, 0)
		expect(run.status).toBe('lost')
	})

	it('wave transition preserves total score and clears attachments', () => {
		let run = createEndlessRun(0)
		run = {
			...run,
			score: 7,
			hitsRemainingInWave: 1,
			waveTarget: 8,
			status: 'projectileFlying',
			game: {
				...run.game,
				status: 'projectileFlying',
				remainingThrows: 1,
				impactElapsedMs: 100,
				attachedProjectiles: [
					{ id: 'a', angle: 10 },
					{ id: 'b', angle: 40 },
					{ id: 'c', angle: 80 },
				],
			},
		}
		const afterHit = resolveEndlessImpact(run, 100, 0)
		expect(afterHit.status).toBe('waveClear')
		expect(afterHit.score).toBe(8)

		const next = advanceEndlessWave(afterHit)
		expect(next.score).toBe(8)
		expect(next.wave).toBe(2)
		expect(next.game.attachedProjectiles.map((p) => p.angle)).toEqual(
			next.level.initialObstacles,
		)
		expect(next.status).toBe('playing')
	})

	it('retry resets run score', () => {
		const retried = retryEndlessRun(42)
		expect(retried.score).toBe(0)
		expect(retried.wave).toBe(1)
	})

	it('createEndlessRunAtBand jumps difficulty predictably', () => {
		const run = createEndlessRunAtBand(3, 0)
		expect(run.score).toBe(30)
		expect(difficultyBandForScore(run.score)).toBe(3)
		expect(validateLevelConfig(run.level).ok).toBe(true)
	})
})

describe('endless best score helpers', () => {
	it('marks new record when score exceeds best', () => {
		let run = createEndlessRun(5)
		run = {
			...run,
			score: 5,
			hitsRemainingInWave: 2,
			status: 'projectileFlying',
			game: {
				...run.game,
				status: 'projectileFlying',
				remainingThrows: 2,
				impactElapsedMs: 50,
				attachedProjectiles: [],
			},
		}
		const next = resolveEndlessImpact(run, 50, 5)
		expect(next.score).toBe(6)
		expect(next.isNewRecord).toBe(true)
	})
})
