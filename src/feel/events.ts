/**
 * Presentation events — decoupled from authoritative game rules.
 * Feedback (audio/haptics/particles) reacts to these after logic resolves.
 */

export type FeelEventType =
	| 'levelStarted'
	| 'throwStarted'
	| 'successfulHit'
	| 'collision'
	| 'levelWon'
	| 'retry'

export interface FeelEvent {
	type: FeelEventType
	/** Optional local impact angle for particle origin (degrees). */
	localAngle?: number | null
	/** Level display number for milestone unlock toasts. */
	displayNumber?: number
}

export type FeelListener = (event: FeelEvent) => void

const listeners = new Set<FeelListener>()

export function subscribeFeel (listener: FeelListener): () => void {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

/** Fire-and-forget presentation signal — never blocks gameplay. */
export function emitFeel (event: FeelEvent): void {
	for (const listener of listeners) {
		try {
			listener(event)
		} catch {
			// Presentation failures must not affect game rules.
		}
	}
}
