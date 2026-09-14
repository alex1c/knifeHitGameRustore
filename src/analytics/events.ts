/**
 * Semantic analytics event names (no PII / free-form user text).
 */

export type AnalyticsEventName =
	| 'app_open'
	| 'campaign_level_start'
	| 'campaign_level_complete'
	| 'campaign_level_fail'
	| 'endless_start'
	| 'endless_end'
	| 'endless_new_best'
	| 'daily_start'
	| 'daily_complete'
	| 'daily_fail'
	| 'theme_selected'
	| 'learning_open'
	| 'ad_interstitial_impression'
	| 'ad_rewarded_offer'
	| 'ad_rewarded_complete'
	| 'ad_rewarded_failed'

export type AnalyticsParams = {
	level?: number
	mode?: 'campaign' | 'endless' | 'daily'
	score?: number
	wave?: number
	is_new_best?: boolean
	theme_id?: string
}

export const ANALYTICS_EVENT_NAMES: readonly AnalyticsEventName[] = [
	'app_open',
	'campaign_level_start',
	'campaign_level_complete',
	'campaign_level_fail',
	'endless_start',
	'endless_end',
	'endless_new_best',
	'daily_start',
	'daily_complete',
	'daily_fail',
	'theme_selected',
	'learning_open',
	'ad_interstitial_impression',
	'ad_rewarded_offer',
	'ad_rewarded_complete',
	'ad_rewarded_failed',
] as const
