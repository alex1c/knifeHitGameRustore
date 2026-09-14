/**
 * Safe analytics adapter — never throws into gameplay.
 * SDK failures are swallowed; events are semantic-only.
 */

import type { AnalyticsEventName, AnalyticsParams } from './events'
import {
	activateAppMetricaNative,
	reportAppMetricaEventNative,
} from './nativeBridge'

let activated = false
const recentKeys = new Set<string>()
const DEDUPE_MS = 800

function sanitizeParams (
	params?: AnalyticsParams,
): Record<string, string | number | boolean> | undefined {
	if (!params) {
		return undefined
	}
	const out: Record<string, string | number | boolean> = {}
	if (typeof params.level === 'number' && Number.isFinite(params.level)) {
		out.level = Math.floor(params.level)
	}
	if (params.mode === 'campaign' || params.mode === 'endless' || params.mode === 'daily') {
		out.mode = params.mode
	}
	if (typeof params.score === 'number' && Number.isFinite(params.score)) {
		out.score = Math.floor(params.score)
	}
	if (typeof params.wave === 'number' && Number.isFinite(params.wave)) {
		out.wave = Math.floor(params.wave)
	}
	if (typeof params.is_new_best === 'boolean') {
		out.is_new_best = params.is_new_best
	}
	if (typeof params.theme_id === 'string' && params.theme_id.length > 0) {
		// Theme ids are fixed enums from our catalog — never free-form text.
		out.theme_id = params.theme_id.slice(0, 64)
	}
	return Object.keys(out).length > 0 ? out : undefined
}

function dedupeKey (name: AnalyticsEventName, params?: AnalyticsParams): string {
	return `${name}:${JSON.stringify(sanitizeParams(params) ?? {})}`
}

/**
 * One-shot activate. Safe to call multiple times; offline / SDK errors ignored.
 */
export function initAnalytics (): void {
	if (activated) {
		return
	}
	activated = true
	try {
		activateAppMetricaNative()
	} catch {
		// Offline / native missing — do not crash startup.
	}
}

/**
 * Report a semantic event. Never throws.
 * Optional short dedupe prevents double fire from remount/retry loops.
 */
export function trackEvent (
	name: AnalyticsEventName,
	params?: AnalyticsParams,
	options?: { dedupe?: boolean },
): void {
	try {
		if (!activated) {
			initAnalytics()
		}
		if (options?.dedupe !== false) {
			const key = dedupeKey(name, params)
			if (recentKeys.has(key)) {
				return
			}
			recentKeys.add(key)
			setTimeout(() => {
				recentKeys.delete(key)
			}, DEDUPE_MS)
		}
		reportAppMetricaEventNative(name, sanitizeParams(params))
	} catch {
		// Swallow — analytics must never affect gameplay.
	}
}

/** Test helper — reset adapter state between Jest cases. */
export function resetAnalyticsForTests (): void {
	activated = false
	recentKeys.clear()
}
