/**
 * Calendar date-key helpers (YYYY-MM-DD).
 * Avoids millisecond/24h math so DST cannot invent or skip calendar days.
 */

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Formats a Date as local calendar YYYY-MM-DD. */
export function toLocalDateKey (date: Date): string {
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

export function todayLocalDateKey (now: Date = new Date()): string {
	return toLocalDateKey(now)
}

export function isValidDateKey (value: unknown): value is string {
	if (typeof value !== 'string' || !DATE_KEY_RE.test(value)) {
		return false
	}
	const [ys, ms, ds] = value.split('-')
	const y = Number(ys)
	const m = Number(ms)
	const d = Number(ds)
	if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
		return false
	}
	if (m < 1 || m > 12 || d < 1 || d > 31) {
		return false
	}
	const probe = new Date(y, m - 1, d)
	return (
		probe.getFullYear() === y &&
		probe.getMonth() === m - 1 &&
		probe.getDate() === d
	)
}

/** Returns previous calendar date key (local), or null if input invalid. */
export function previousDateKey (dateKey: string): string | null {
	if (!isValidDateKey(dateKey)) {
		return null
	}
	const [ys, ms, ds] = dateKey.split('-')
	const date = new Date(Number(ys), Number(ms) - 1, Number(ds))
	date.setDate(date.getDate() - 1)
	return toLocalDateKey(date)
}

/** True when `later` is exactly one calendar day after `earlier`. */
export function isConsecutiveDate (earlier: string, later: string): boolean {
	if (!isValidDateKey(earlier) || !isValidDateKey(later)) {
		return false
	}
	return previousDateKey(later) === earlier
}

/**
 * Lexicographic compare for YYYY-MM-DD keys.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareDateKeys (a: string, b: string): number {
	if (a === b) {
		return 0
	}
	return a < b ? -1 : 1
}

/** Stable 32-bit hash of a date key (or any string) for seeded generators. */
export function hashStringToSeed (input: string): number {
	let hash = 2166136261
	for (let i = 0; i < input.length; i += 1) {
		hash ^= input.charCodeAt(i)
		hash = Math.imul(hash, 16777619)
	}
	return hash >>> 0
}

/**
 * Mulberry32 seeded PRNG — deterministic, no Math.random.
 * Returns floats in [0, 1).
 */
export function createSeededRng (seed: number): () => number {
	let state = seed >>> 0
	return () => {
		state = (state + 0x6d2b79f5) >>> 0
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

export function seededInt (
	rng: () => number,
	minInclusive: number,
	maxInclusive: number,
): number {
	const min = Math.ceil(minInclusive)
	const max = Math.floor(maxInclusive)
	return Math.floor(rng() * (max - min + 1)) + min
}

export function seededPick<T> (rng: () => number, items: readonly T[]): T {
	return items[Math.floor(rng() * items.length)]!
}
