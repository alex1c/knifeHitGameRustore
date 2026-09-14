/**
 * Campaign second-chance rewarded rules (pure).
 */

import { createInitialGameState } from '../../src/game/engine'
import { DEFAULT_LEVEL } from '../../src/game/config/levels'
import {
	canOfferCampaignSecondChance,
	resumeAfterSecondChance,
	shouldPreserveLossOnRewardFailure,
} from '../../src/ads/secondChance'

describe('campaign second chance', () => {
	it('offers only for campaign when unused', () => {
		expect(canOfferCampaignSecondChance('campaign', false)).toBe(true)
		expect(canOfferCampaignSecondChance('campaign', true)).toBe(false)
	})

	it('blocks endless and daily', () => {
		expect(canOfferCampaignSecondChance('endless', false)).toBe(false)
		expect(canOfferCampaignSecondChance('daily', false)).toBe(false)
	})

	it('confirmed reward resumes without attaching collision projectile', () => {
		const base = createInitialGameState(DEFAULT_LEVEL, 'playing')
		const withHits = {
			...base,
			attachedProjectiles: [
				...base.attachedProjectiles,
				{ id: 'throw-1', angle: 40 },
			],
			remainingThrows: 3,
			status: 'lost' as const,
			lastImpactLocalAngle: 42,
		}
		const resumed = resumeAfterSecondChance(withHits)
		expect(resumed.status).toBe('playing')
		expect(resumed.remainingThrows).toBe(3)
		expect(resumed.attachedProjectiles).toEqual(withHits.attachedProjectiles)
		expect(resumed.lastImpactLocalAngle).toBeNull()
		expect(
			resumed.attachedProjectiles.some((p) => p.angle === 42),
		).toBe(false)
	})

	it('failed reward preserves loss semantics', () => {
		expect(shouldPreserveLossOnRewardFailure(false)).toBe(true)
		expect(shouldPreserveLossOnRewardFailure(true)).toBe(false)
	})

	it('second rewarded in same attempt blocked', () => {
		expect(canOfferCampaignSecondChance('campaign', true)).toBe(false)
	})
})
