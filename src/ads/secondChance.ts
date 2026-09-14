/**
 * Campaign second-chance (rewarded) pure rules.
 */

import type { GameMode } from '../modes/types'
import type { GameState } from '../game/models'

export function canOfferCampaignSecondChance (
	mode: GameMode,
	secondChanceUsedThisAttempt: boolean,
): boolean {
	if (mode !== 'campaign') {
		return false
	}
	return !secondChanceUsedThisAttempt
}

/**
 * Resume after confirmed reward: collision projectile was never attached;
 * restore playing with prior attachments and remaining throws.
 */
export function resumeAfterSecondChance (lostState: GameState): GameState {
	return {
		...lostState,
		status: 'playing',
		throwStartElapsedMs: null,
		impactElapsedMs: null,
		lastImpactLocalAngle: null,
	}
}

export function shouldPreserveLossOnRewardFailure (
	rewardConfirmed: boolean,
): boolean {
	return !rewardConfirmed
}
